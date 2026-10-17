import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  Color,
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
import fragmentShader from '../shaders/cursorField.frag'
import vertexShader from '../shaders/cursorField.vert'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'

/** The field's resolution: the air moves in soft, broad strokes; this is plenty. */
const SIZE = 128

/**
 * The cursor's reach (NDC, frame height = 2): about 0.8 world units at the subject's
 * distance. Phones (a finger, a smaller screen): a little wider.
 */
const RADIUS = { pointer: 0.26, touch: 0.32 }

/** How hard a pass of the cursor kicks the air (the field); phones push a little less. */
const STRENGTH = { field: 5.5, touch: 0.7 }

/** The column's light sweep (the spine's oil shader): its span and period, Work space. */
const SWEEP = { from: sceneConfig.spine.top + 1.5, to: sceneConfig.spine.bottom - 1.5, period: 7 }

const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/**
 * The uniforms every glass grain in the world shares (shaders/grainMotion.glsl and
 * glassGrain.glsl): the same objects in every material, so one update moves them all.
 */
export const grainUniforms = {
  uCursorField: { value: null as Texture | null },
  uCursorMode: { value: 0 },
  uCursor: { value: new Vector4() },
  uCursorRadius: { value: RADIUS.pointer },
  uParallax: { value: new Vector2() },
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
  work: { from: new Vector3(-0.45, 0.7, 0.55), color: new Color().copy(sceneColors.glass).lerp(sceneColors.violet, 0.25) },
  system: { from: new Vector3(0.1, 0.9, 0.4), color: new Color().copy(sceneColors.glass).lerp(sceneColors.blue, 0.35) },
  depth: { from: new Vector3(0, 1, 0.15), color: new Color().copy(sceneColors.glow).lerp(sceneColors.glass, 0.4) },
  contact: { from: new Vector3(0.6, 0.65, 0.45), color: new Color().copy(sceneColors.warm).lerp(sceneColors.glass, 0.3) },
}

/** The spring field: two half-float targets, ping-ponged by a full-screen pass. */
class SpringField {
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
    fragmentShader,
    uniforms: {
      uPrevious: { value: null as Texture | null },
      uCursor: { value: new Vector4() },
      uVelocity: { value: new Vector2() },
      uDt: { value: 0 },
      uOmega: { value: 2 * Math.PI * MOTION.air.frequency },
      uZeta: { value: MOTION.air.damping },
      uStrength: { value: STRENGTH.field },
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

  /** One step: the cursor now and last frame (NDC), its gated velocity (NDC / s). */
  step(
    gl: WebGLRenderer,
    cursor: Vector2,
    was: Vector2,
    velocity: Vector2,
    dt: number,
    radius: number,
    aspect: number,
  ) {
    const u = this.material.uniforms
    ;(u.uCursor!.value as Vector4).set(cursor.x, cursor.y, was.x, was.y)
    ;(u.uVelocity!.value as Vector2).copy(velocity)
    u.uDt!.value = dt
    u.uRadius!.value = radius
    u.uAspect!.value = aspect
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

  dispose() {
    this.targets.forEach((target) => target.dispose())
    this.material.dispose()
    this.geometry.dispose()
  }
}

type Props = {
  pointer: Pointer
  journey: JourneyState
  clock: SceneClock
  reducedMotion: boolean
}

type FrameInput = Props & { gl: WebGLRenderer; delta: number; aspect: number }

/** Everything the air needs from frame to frame. */
class Air {
  readonly field = new SpringField()
  private last = new Vector2(0.5, 0.5)
  private was = new Vector2()
  private cursor = new Vector2()
  private velocity = new Vector2()
  private stir = new Spring(0, MOTION.air)
  private px = new Spring(0, MOTION.pointer)
  private py = new Spring(0, MOTION.pointer)
  private direction = new Vector3()
  private color = new Color()
  private scratch = new Color()
  /** A finger, not a mouse (phones and tablets): the lighter, stateless push. */
  touch = false

  frame({ gl, delta, aspect, pointer, journey, clock, reducedMotion }: FrameInput) {
    const dt = Math.min(delta, 1 / 30)
    const u = grainUniforms
    const lite = useTier.getState().tier === 'lite'
    const mode = reducedMotion ? 0 : lite || this.touch ? 1 : 2
    u.uCursorMode.value = mode
    const radius = this.touch ? RADIUS.touch : RADIUS.pointer
    u.uCursorRadius.value = radius

    // The cursor in NDC and its velocity (NDC / s).
    this.cursor.set(pointer.uv.x * 2 - 1, pointer.uv.y * 2 - 1)
    this.velocity.subVectors(this.cursor, this.last).divideScalar(Math.max(delta, 1e-3))
    this.velocity.clampLength(0, 8)
    this.was.copy(this.last)
    this.last.copy(this.cursor)
    // No stirring while scrolling (the world moves, not the cursor), while a card is hovered
    // or open (the card answers), or over the text column (bottom left; phones: the bottom).
    // Phones keep the card in view focused (it scrambles), so there only an open card counts.
    const { focused, opened } = useWork.getState()
    const onCard = opened || (!this.touch && focused)
    const overText = this.touch
      ? pointer.uv.y < 0.35
      : pointer.uv.x < 0.33 && pointer.uv.y < 0.55
    if (!pointer.active || Math.abs(journey.velocity) > 0.6 || onCard || overText) {
      this.velocity.set(0, 0)
    }

    if (mode === 2) {
      this.field.step(gl, this.cursor, this.was, this.velocity, dt, radius, aspect)
      u.uCursorField.value = this.field.texture
    } else {
      // Stateless: the air round the cursor is stirred by its speed and settles on the spring.
      this.stir.step(mode === 1 ? Math.min(1, this.velocity.length() / 1.5) : 0, dt)
      const push = Math.max(0, this.stir.value) * (this.touch ? STRENGTH.touch : 1)
      u.uCursor.value.set(this.cursor.x, this.cursor.y, push, 0)
      if (window.__air) window.__air.push = push
    }

    // The whole field shifts a little against the cursor (~1.5% of the frame), lagging like
    // the camera's own pointer parallax.
    const still = reducedMotion ? 0 : 1
    this.px.step((0.5 - pointer.uv.x) * 0.03 * still, dt)
    this.py.step((0.5 - pointer.uv.y) * 0.03 * still, dt)
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
    color.copy(LIGHTS.hero.color).lerp(sceneColors.warm, warm * 0.8).multiplyScalar(hero)
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
 * The air's answer to the cursor, for every grain in the world (Stage 3, "one voice"): the
 * cursor parts the clouds it passes through, pushing grains aside with a slight swirl; they
 * spring back home in ~1–1.5s with a tiny overshoot (MOTION.air), their glints brightening
 * while disturbed. The whole field also shifts a little against the cursor, on the camera's
 * own pointer lag. Full tier: a small screen-space spring field the cursor's path writes into
 * (a short trail behind it); lite and phones (a finger dragging without scrolling): a
 * stateless push round the cursor that eases out as the air settles. Off with reduced
 * motion, while scrolling, over a hovered or open card and over the text column.
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
