import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  Color,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { useTier } from '@/stores/tier'
import { useWork } from '@/stores/work'
import { sceneColors, sceneConfig } from '@/styles/scene'
import { lightDrift } from '../hero/motion'
import { type JourneyState, PLACES } from '../journey/path'
import { MOTION, Spring } from '../motion/motion'
import airPush from '../shaders/airPush.glsl'
import fieldFragment from '../shaders/cursorField.frag'
import vertexShader from '../shaders/cursorField.vert'
import grainMotionChunk from '../shaders/grainMotion.glsl'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'

/** The flow field's resolution (full tier): the air moves in soft, broad strokes. */
const SIZE = 256

/**
 * The cursor's reach (NDC, frame height = 2): about 0.8 world units at the subject's
 * distance. Phones (a finger, a smaller screen): a little wider.
 */
const RADIUS = { pointer: 0.26, touch: 0.32 }

/**
 * A finger (a drag that doesn't scroll) stirs the air at 60% of a mouse; a quick tap sends a
 * small ripple (the ring's outward speed, square units / s, before the place's strength).
 */
const TOUCH = { strength: 0.6, ripple: 0.9 }

/** How strongly each place's air answers: Work and the hero most, the places with text least. */
const PLACE_STRENGTH = { hero: 1, statement: 0.5, work: 1, system: 0.8, depth: 0.8, contact: 0.6 }

/** Lite: the cursor's recent path, a sample every 0.1 s, the last 16 kept (1.6 s). */
const TRAIL = { count: 16, every: 0.1 }

/** The areas kept clear: two cards, three text blocks; the text is measured every 0.2 s. */
const CLEAR = { cards: 2, text: 3, every: 0.2, pad: 10 }

/** The column's light sweep (the spine's oil shader): its span and period, Work space. */
const SWEEP = { from: sceneConfig.spine.top + 1.5, to: sceneConfig.spine.bottom - 1.5, period: 7 }

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/**
 * The vertex side every glass grain in the world shares (how the air carries it, how it
 * catches the light), with the cursor's push it shares with the flow field.
 */
export const grainMotion = `${airPush}\n${grainMotionChunk}`

/**
 * The uniforms every glass grain in the world shares (shaders/grainMotion.glsl and
 * glassGrain.glsl): the same objects in every material, so one update moves them all.
 */
export const grainUniforms = {
  uCursorField: { value: null as Texture | null },
  uCursorMode: { value: 0 },
  uCursorRadius: { value: RADIUS.pointer },
  uParallax: { value: new Vector2() },
  uAirTrail: { value: Array.from({ length: TRAIL.count }, () => new Vector4()) },
  uAirTrailLife: { value: Array.from({ length: TRAIL.count }, () => new Vector4(99, 0, 0, 0)) },
  uAirRipple: { value: new Vector4(0, 0, 0, 99) },
  uAirSpring: { value: new Vector2(2 * Math.PI * MOTION.air.frequency, MOTION.air.damping) },
  uAirStrength: { value: 1 },
  uKeepClear: {
    value: Array.from({ length: CLEAR.cards + CLEAR.text }, () => new Vector4(1, 1, -1, -1)),
  },
  uGrainLight: { value: new Vector3(0.45, 0.75, 0.5) },
  uGrainLightColor: { value: new Color() },
  uGrainSweep: { value: new Vector2() },
  uGrainSweepColor: { value: new Color() },
  uGrainFilm: { value: [sceneColors.teal, sceneColors.pink, sceneColors.warm] },
}

/**
 * Keeps a grain material on its tier: the lite tier drops the bead's refraction (one
 * recompile, on the switch).
 */
export function syncGrainTier(material: ShaderMaterial | null | undefined) {
  if (!material) return
  const lite = useTier.getState().tier === 'lite'
  if (lite === 'GRAIN_LITE' in material.defines) return
  const defines = { ...material.defines }
  if (lite) defines.GRAIN_LITE = ''
  else delete defines.GRAIN_LITE
  material.defines = defines
  material.needsUpdate = true
}

/** Each place's light, the direction it comes from (world) and its colour. */
const LIGHTS = {
  hero: { from: new Vector3(0.45, 0.75, 0.5), color: sceneColors.glass },
  work: {
    from: new Vector3(-0.45, 0.7, 0.55),
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.violet, 0.25),
  },
  system: {
    from: new Vector3(0.1, 0.9, 0.4),
    color: new Color().copy(sceneColors.glass).lerp(sceneColors.blue, 0.35),
  },
  depth: {
    from: new Vector3(0, 1, 0.15),
    color: new Color().copy(sceneColors.glow).lerp(sceneColors.glass, 0.4),
  },
  contact: {
    from: new Vector3(0.6, 0.65, 0.45),
    color: new Color().copy(sceneColors.warm).lerp(sceneColors.glass, 0.3),
  },
}

/** The flow field (full tier): two half-float targets, ping-ponged by a full-screen pass. */
class FlowField {
  private targets = [0, 1].map(
    () =>
      new WebGLRenderTarget(SIZE, SIZE, {
        type: HalfFloatType,
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
      }),
  )
  private read = 0
  private cleared = false
  readonly material = new ShaderMaterial({
    vertexShader,
    fragmentShader: `${airPush}\n${fieldFragment}`,
    uniforms: {
      uPrevious: { value: null as Texture | null },
      uCursor: { value: new Vector4() },
      uVelocity: { value: new Vector2() },
      uRipple: { value: new Vector3() },
      uDt: { value: 0 },
      uTime: { value: 0 },
      uOmega: { value: 2 * Math.PI * MOTION.air.frequency },
      uZeta: { value: MOTION.air.damping },
      uStrength: { value: 1 },
      uRadius: { value: RADIUS.pointer },
      uAspect: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
  })
  private geometry = new PlaneGeometry(2, 2)
  private scene = new Scene().add(new Mesh(this.geometry, this.material))
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  get texture() {
    return this.targets[this.read]!.texture
  }

  /**
   * One step: the cursor now and last frame (NDC), its gated velocity (NDC / s), a tap's
   * ripple (xy NDC, z strength; 0 = none), how strongly the air answers here.
   */
  step(gl: WebGLRenderer, input: FlowInput) {
    const u = this.material.uniforms
    const { cursor, was, velocity, ripple } = input
    ;(u.uCursor!.value as Vector4).set(cursor.x, cursor.y, was.x, was.y)
    ;(u.uVelocity!.value as Vector2).copy(velocity)
    ;(u.uRipple!.value as Vector3).copy(ripple)
    u.uDt!.value = input.dt
    u.uTime!.value = input.time
    u.uRadius!.value = input.radius
    u.uAspect!.value = input.aspect
    u.uStrength!.value = input.strength
    const previous = gl.getRenderTarget()
    if (!this.cleared) {
      // Start at rest: zero displacement and velocity (the default clear alpha may be 1).
      this.cleared = true
      const color = gl.getClearColor(new Color())
      const alpha = gl.getClearAlpha()
      gl.setClearColor(0x000000, 0)
      for (const target of this.targets) {
        gl.setRenderTarget(target)
        gl.clear()
      }
      gl.setClearColor(color, alpha)
    }
    const write = 1 - this.read
    this.material.uniforms.uPrevious!.value = this.targets[this.read]!.texture
    gl.setRenderTarget(this.targets[write]!)
    gl.render(this.scene, this.camera)
    gl.setRenderTarget(previous)
    this.read = write
  }

  /**
   * Measurement only: the furthest the air has moved now, and how far it has at `at` (px,
   * screen coordinates), in px (a grain at the focus).
   */
  measure(gl: WebGLRenderer, width: number, height: number, at?: number[]) {
    const data = new Uint16Array(SIZE * SIZE * 4)
    gl.readRenderTargetPixels(this.targets[this.read]!, 0, 0, SIZE, SIZE, data)
    const moved = (i: number) =>
      Math.hypot(
        DataUtils.fromHalfFloat(data[i * 4]!) * (width / 2),
        DataUtils.fromHalfFloat(data[i * 4 + 1]!) * (height / 2),
      )
    let peak = 0
    for (let i = 0; i < SIZE * SIZE; i++) peak = Math.max(peak, moved(i))
    let local = 0
    if (at) {
      const x = Math.min(SIZE - 1, Math.floor((at[0]! / width) * SIZE))
      const y = Math.min(SIZE - 1, Math.floor((1 - at[1]! / height) * SIZE))
      local = moved(y * SIZE + x)
    }
    return { peak, local }
  }

  dispose() {
    this.targets.forEach((target) => target.dispose())
    this.material.dispose()
    this.geometry.dispose()
  }
}

type FlowInput = {
  cursor: Vector2
  was: Vector2
  velocity: Vector2
  ripple: Vector3
  dt: number
  time: number
  radius: number
  aspect: number
  strength: number
}

/** Measurement only: airPush.glsl in JS (square units). */
function airPush2(vx: number, vy: number, ox: number, oy: number) {
  const speed = Math.hypot(vx, vy)
  const carry = (0.4 * speed) / (speed + 1.2)
  const length = Math.max(Math.hypot(ox, oy), 1e-4)
  const [dx, dy] = [ox / length, oy / length]
  const side = Math.sign(vx * oy - vy * ox)
  return [
    carry * (vx + (dx * 0.35 - dy * side * 0.3) * speed),
    carry * (vy + (dy * 0.35 + dx * side * 0.3) * speed),
  ] as const
}

/**
 * Lite: the cursor's recent path for the grains' shader (grainMotion.glsl, airTrail), a
 * stretch every 0.1 s: where it went, its velocity and its age (from its middle). A stretch
 * that was gated (scrolling, over the text, on a card) is left out.
 */
class Trail {
  private at = -1
  private from = new Vector2()
  private blocked = false
  private head = 0
  private times = new Array<number>(TRAIL.count).fill(-99)
  private rippleAt = -99

  record(time: number, cursor: Vector2, allowed: boolean, aspect: number) {
    this.blocked ||= !allowed
    if (this.at < 0 || time - this.at > 1) {
      this.at = time
      this.from.copy(cursor)
      this.blocked = !allowed
      return
    }
    const span = time - this.at
    if (span < TRAIL.every) return
    const dx = cursor.x - this.from.x
    const dy = cursor.y - this.from.y
    const travelled = Math.hypot(dx * aspect, dy)
    if (!this.blocked && travelled > 0.004) {
      const { uAirTrail, uAirTrailLife } = grainUniforms
      uAirTrail.value[this.head]!.set(this.from.x, this.from.y, cursor.x, cursor.y)
      uAirTrailLife.value[this.head]!.set(0, 0, dx / span, dy / span)
      this.times[this.head] = time - span / 2
      this.head = (this.head + 1) % TRAIL.count
    }
    this.at = time
    this.from.copy(cursor)
    this.blocked = !allowed
  }

  ripple(time: number, at: Vector2, strength: number) {
    this.rippleAt = time
    grainUniforms.uAirRipple.value.set(at.x, at.y, strength, 0)
  }

  /** Ages for this frame; with nothing recent the shader's loop skips every stretch. */
  upload(time: number) {
    const life = grainUniforms.uAirTrailLife.value
    for (let i = 0; i < TRAIL.count; i++) life[i]!.x = time - this.times[i]!
    grainUniforms.uAirRipple.value.w = time - this.rippleAt
  }

  clear() {
    this.times.fill(-99)
    this.rippleAt = -99
    this.at = -1
  }

  /**
   * Measurement only: the furthest the air has moved now, and how far it has at `at` (px,
   * screen coordinates), in px (a grain at the focus): the shader's airTrail evaluated on a
   * grid (the ripple left out).
   */
  measure(
    time: number,
    radius: number,
    strength: number,
    width: number,
    height: number,
    at?: number[],
  ) {
    const { x: omega, y: zeta } = grainUniforms.uAirSpring.value
    const wd = omega * Math.sqrt(1 - zeta * zeta)
    const aspect = width / height
    const moved = (px: number, py: number) => {
      let dx = 0
      let dy = 0
      for (let i = 0; i < TRAIL.count; i++) {
        const age = time - this.times[i]!
        if (age > 3) continue
        const stretch = grainUniforms.uAirTrail.value[i]!
        const life = grainUniforms.uAirTrailLife.value[i]!
        const pax = (px - stretch.x) * aspect
        const pay = py - stretch.y
        const bax = (stretch.z - stretch.x) * aspect
        const bay = stretch.w - stretch.y
        const len = Math.max(Math.hypot(bax, bay), 1e-5)
        const t = (pax * bax + pay * bay) / len
        const h = Math.min(len, Math.max(0, t))
        const ox = pax - (bax / len) * h
        const oy = pay - (bay / len) * h
        const d = (pax * bay - pay * bax) / len
        const share =
          Math.exp(-(d * d) / (radius * radius)) *
          0.5 *
          (Math.tanh((1.2 * t) / radius) - Math.tanh((1.2 * (t - len)) / radius))
        if (share < 0.005) continue
        const [pushX, pushY] = airPush2(life.z * aspect, life.w, ox, oy)
        const linger = Math.min(
          3,
          1.07 / Math.max(Math.hypot(life.z * aspect, life.w), 0.05) + 0.52,
        )
        const response = (Math.exp(-zeta * omega * age) * Math.sin(wd * age)) / wd
        dx += pushX * linger * share * response
        dy += pushY * linger * share * response
      }
      return Math.hypot(((dx / aspect) * strength * width) / 2, (dy * strength * height) / 2)
    }
    let peak = 0
    for (let gy = 0; gy <= 40; gy++) {
      for (let gx = 0; gx <= 64; gx++)
        peak = Math.max(peak, moved((gx / 64) * 2 - 1, (gy / 40) * 2 - 1))
    }
    const local = at ? moved((at[0]! / width) * 2 - 1, 1 - (at[1]! / height) * 2) : 0
    return { peak, local }
  }
}

/**
 * The areas the air keeps clear (grains never pushed into them, no stirring over the text):
 * the text blocks marked `data-keep-clear` (their text's own extent, while they show; read
 * from the page every 0.2 s) and the card in focus (WorkCards, `keepClear`).
 */
class ClearAreas {
  private next = 0
  private text: Vector4[] = Array.from({ length: CLEAR.text }, () => new Vector4(1, 1, -1, -1))
  private range: Range | null = null
  readonly cards = new Map<string, Vector4>()

  update(time: number) {
    if (time < this.next) return
    this.next = time + CLEAR.every
    this.range ??= document.createRange()
    const width = window.innerWidth
    const height = window.innerHeight
    let n = 0
    for (const element of document.querySelectorAll('[data-keep-clear]')) {
      if (n >= CLEAR.text) break
      if (element.checkVisibility && !element.checkVisibility({ opacityProperty: true })) continue
      this.range.selectNodeContents(element)
      const r = this.range.getBoundingClientRect()
      if (r.width < 1 || r.bottom < 0 || r.top > height || r.right < 0 || r.left > width) continue
      this.text[n++]!.set(
        ((r.left - CLEAR.pad) / width) * 2 - 1,
        1 - ((r.bottom + CLEAR.pad) / height) * 2,
        ((r.right + CLEAR.pad) / width) * 2 - 1,
        1 - ((r.top - CLEAR.pad) / height) * 2,
      )
    }
    for (let i = n; i < CLEAR.text; i++) this.text[i]!.set(1, 1, -1, -1)
  }

  /** Whether a point (NDC) is over a text block. */
  overText(at: Vector2) {
    return this.text.some((r) => at.x > r.x && at.x < r.z && at.y > r.y && at.y < r.w)
  }

  upload() {
    const slots = grainUniforms.uKeepClear.value
    let i = 0
    for (const area of this.cards.values()) {
      if (i >= CLEAR.cards) break
      slots[i++]!.copy(area)
    }
    while (i < CLEAR.cards) slots[i++]!.set(1, 1, -1, -1)
    for (const area of this.text) slots[i++]!.copy(area)
  }
}

const areas = new ClearAreas()

/**
 * The card in focus (hovered, open, or at the camera's stop): its screen area (NDC x0, y0,
 * x1, y1), which the air keeps clear; null when it no longer is.
 */
export function keepClear(slug: string, area: Vector4 | null) {
  if (area) areas.cards.set(slug, area)
  else areas.cards.delete(slug)
}

type Props = {
  pointer: Pointer
  journey: JourneyState
  clock: SceneClock
  reducedMotion: boolean
}

type FrameInput = Props & { gl: WebGLRenderer; delta: number; aspect: number }

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** How strongly the air answers along the path (PLACE_STRENGTH, blended between places). */
function placeStrength(journey: JourneyState) {
  const work = ease(journey.toWork) * (1 - ease(journey.toSystem))
  const system = ease(journey.toSystem) * (1 - ease(journey.toDepth))
  const depth = ease(journey.toDepth) * (1 - ease(journey.toContact))
  const contact = ease(journey.toContact) * (1 - ease(journey.loop))
  const statement = smooth(journey.camera) * (1 - ease(journey.toWork))
  const hero = Math.max(0, 1 - work - system - depth - contact - statement)
  const p = PLACE_STRENGTH
  return (
    hero * p.hero +
    statement * p.statement +
    work * p.work +
    system * p.system +
    depth * p.depth +
    contact * p.contact
  )
}

/** Everything the air needs from frame to frame. */
class Air {
  readonly field = new FlowField()
  private readonly trail = new Trail()
  private last = new Vector2(0.5, 0.5)
  private was = new Vector2()
  private cursor = new Vector2()
  private velocity = new Vector2()
  private ripple = new Vector3()
  private tapped = 0
  private scrollY = 0
  private px = new Spring(0, MOTION.pointer)
  private py = new Spring(0, MOTION.pointer)
  private direction = new Vector3()
  private color = new Color()
  private scratch = new Color()
  /** A finger, not a mouse (phones and tablets): a drag stirs at 60%, a tap sends a ripple. */
  touch = false

  frame({ gl, delta, aspect, pointer, journey, clock, reducedMotion }: FrameInput) {
    const dt = Math.min(delta, 1 / 30)
    const u = grainUniforms
    const lite = useTier.getState().tier === 'lite'
    const mode = reducedMotion ? 0 : lite ? 1 : 2
    u.uCursorMode.value = mode
    const radius = this.touch ? RADIUS.touch : RADIUS.pointer
    u.uCursorRadius.value = radius
    const strength = placeStrength(journey) * (this.touch ? TOUCH.strength : 1)
    u.uAirStrength.value = strength
    areas.update(clock.time)
    areas.upload()

    // The cursor in NDC and its velocity (NDC / s).
    this.cursor.set(pointer.uv.x * 2 - 1, pointer.uv.y * 2 - 1)
    this.velocity.subVectors(this.cursor, this.last).divideScalar(Math.max(delta, 1e-3))
    this.velocity.clampLength(0, 8)
    this.was.copy(this.last)
    this.last.copy(this.cursor)
    // No stirring while scrolling (the world moves, not the cursor; on phones any scroll of
    // the page, so a drag that scrolls never stirs), while a card is hovered or open (the
    // card answers) or over the text. Phones keep the card in view focused (it scrambles),
    // so there only an open card counts.
    const scrolled = Math.abs(window.scrollY - this.scrollY) > 0.5
    this.scrollY = window.scrollY
    const scrolling = Math.abs(journey.velocity) > 0.6 || (this.touch && scrolled)
    const { focused, opened } = useWork.getState()
    const onCard = opened || (!this.touch && focused)
    const allowed = pointer.active && !scrolling && !onCard && !areas.overText(this.cursor)
    if (!allowed) this.velocity.set(0, 0)
    // A quick tap (phones): a small ripple, once.
    this.ripple.set(0, 0, 0)
    if (pointer.tap.at > this.tapped) {
      this.tapped = pointer.tap.at
      if (!opened && !areas.overText(pointer.tap.ndc)) {
        this.ripple.set(pointer.tap.ndc.x, pointer.tap.ndc.y, TOUCH.ripple * strength)
      }
    }

    if (mode === 2) {
      this.field.step(gl, {
        cursor: this.cursor,
        was: this.was,
        velocity: this.velocity,
        ripple: this.ripple,
        dt,
        time: clock.time,
        radius,
        aspect,
        strength,
      })
      u.uCursorField.value = this.field.texture
    } else if (mode === 1) {
      this.trail.record(clock.time, this.cursor, allowed, aspect)
      if (this.ripple.z > 0) this.trail.ripple(clock.time, pointer.tap.ndc, this.ripple.z)
      this.trail.upload(clock.time)
    } else {
      this.trail.clear()
    }
    const probe = window.__air
    if (probe) {
      probe.strength = strength
      if (probe.request) {
        // Measurement only (scripts/cursor-flow.mjs): how far a grain at the focus has moved.
        probe.request = false
        const { innerWidth: width, innerHeight: height } = window
        const measured =
          mode === 2
            ? this.field.measure(gl, width, height, probe.at)
            : mode === 1
              ? this.trail.measure(clock.time, radius, strength, width, height, probe.at)
              : { peak: 0, local: 0 }
        probe.peak = measured.peak
        probe.local = measured.local
      }
    }

    // The whole field shifts a little against the cursor, lagging like the camera's own
    // pointer parallax: with the cursor at an edge, grains at the subject's depth shift 1.5% of
    // the frame, nearer ones up to ~2.7%, far ones ~1% (grainMotion.glsl, `near`).
    const still = reducedMotion ? 0 : 1
    this.px.step((0.5 - pointer.uv.x) * 0.06 * still, dt)
    this.py.step((0.5 - pointer.uv.y) * 0.06 * still, dt)
    u.uParallax.value.set(this.px.value, this.py.value)

    // The place's light, blended along the path; Work's column sweeps a band down it.
    const work = ease(journey.toWork) * (1 - ease(journey.toSystem))
    const system = ease(journey.toSystem) * (1 - ease(journey.toDepth))
    const depth = ease(journey.toDepth) * (1 - ease(journey.toContact))
    const contact = ease(journey.toContact) * (1 - ease(journey.loop))
    const hero = Math.max(0, 1 - work - system - depth - contact)
    this.direction
      .copy(LIGHTS.hero.from)
      .multiplyScalar(hero)
      .addScaledVector(LIGHTS.work.from, work)
      .addScaledVector(LIGHTS.system.from, system)
      .addScaledVector(LIGHTS.depth.from, depth)
      .addScaledVector(LIGHTS.contact.from, contact)
    u.uGrainLight.value.copy(this.direction.normalize())
    // The hero's light drifts to warm copper with The Core's (full tier).
    const warm = lite ? 0 : lightDrift(clock.time, sceneConfig.light.warmPeriod) * hero
    const { color, scratch } = this
    color
      .copy(LIGHTS.hero.color)
      .lerp(sceneColors.warm, warm * 0.8)
      .multiplyScalar(hero)
    color.add(scratch.copy(LIGHTS.work.color).multiplyScalar(work))
    color.add(scratch.copy(LIGHTS.system.color).multiplyScalar(system))
    color.add(scratch.copy(LIGHTS.depth.color).multiplyScalar(depth))
    color.add(scratch.copy(LIGHTS.contact.color).multiplyScalar(contact))
    u.uGrainLightColor.value.copy(color)
    const phase = (clock.time % SWEEP.period) / SWEEP.period
    u.uGrainSweep.value.set(PLACES.work + SWEEP.from + (SWEEP.to - SWEEP.from) * phase, work)
    u.uGrainSweepColor.value
      .copy(sceneColors.pink)
      .lerp(sceneColors.teal, 0.5 + 0.5 * Math.sin(clock.time * 0.4))
  }
}

/**
 * The air's answer to the cursor, for every grain in the world, like dust in water: the
 * cursor drags the air along its path, parting it a little with a swirl either side; the
 * grains drift on for a moment after it stops (~0.3–0.4 s), then spring home, settled in
 * about two seconds with a tiny overshoot (MOTION.air), their glints flickering while the air
 * moves them. The whole field also shifts a little against the cursor, on the camera's own
 * pointer lag. Full tier: a 256² screen-space flow field the cursor writes its velocity into
 * (carried on by itself, with a slight curl); lite: the cursor's recent path, answered in the
 * grains' shader. Phones: a drag that doesn't scroll stirs at 60%, a tap sends a ripple.
 * Each place answers with its own strength. Off with reduced motion, while scrolling, over a
 * hovered or open card and over the text; grains are never pushed onto the card in focus or
 * the text.
 *
 * It also sets each place's light for the grains (where it comes from, its colour, and the
 * column's passing sweep at Work), so clouds shimmer as the light moves.
 */
export function CursorField(props: Props) {
  const air = useRef<Air>(null)
  air.current ??= new Air()
  useEffect(() => {
    const current = air.current
    if (current) current.touch = window.matchMedia('(pointer: coarse)').matches
    return () => current?.field.dispose()
  }, [])

  useFrame(({ gl, size }, delta) => {
    air.current?.frame({ ...props, gl, delta, aspect: size.width / size.height })
  }, -2)

  return null
}
