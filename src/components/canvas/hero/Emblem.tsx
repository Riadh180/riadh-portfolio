import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Mesh, Vector3 } from 'three'
import { sceneConfig } from '@/styles/scene'
import { type JourneyState, PLACES, statementLift } from '../journey/path'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { createBandGeometry, roundedSquareCurve } from './bandGeometry'
import type { GlassLook } from './glassLook'
import { applyGlassLook, createGlassMaterial, disposeGlassMaterial } from './glassMaterial'
import { idleSpin } from './motion'
import { useCursor } from '@/stores/cursor'
import { revealed } from '@/stores/loading'
import { useTier } from '@/stores/tier'
import { BURST } from './IntroBurst'

type Props = {
  look: GlassLook
  pointer: Pointer
  clock: SceneClock
  reducedMotion: boolean
  /** Where the visitor is on the camera path; omitted, the emblem stays at the hero. */
  journey?: JourneyState
  /**
   * A second Core elsewhere (the centre of the skills graph): it stays at the group's
   * origin at this size and leaves the scene's light alone.
   */
  anchored?: { scale: number }
}

/**
 * Where The Core floats at each place. At the statement it has come closer and stands in
 * front of the tagline's right end, so its glass bends the type behind it.
 */
const POSES = {
  /** Slightly above centre: the first frame's undeniable subject. */
  hero: new Vector3(0, 0.45, 0),
  statement: new Vector3(-0.2, PLACES.statement - 0.65, 3),
}

/**
 * At the statement The Core stops spinning and holds near edge-on (a tall slit of thick
 * glass with rainbow edges, like the reference disc), upright and larger, spanning all
 * three tagline lines.
 */
const STATEMENT = { scale: 1.45, edge: 1.1 }
/**
 * The hero shows The Core 1.5× larger than its base size. Relative to that, the statement
 * keeps its size (1.45 base); at Contact it is back to base, growing again over the loop,
 * so the view that loops to the top matches the hero.
 */
const HERO = 1.5

/** The held angle nearest `angle`: kπ ± the edge angle (either side, either face). */
function nearestEdge(angle: number) {
  const k = Math.round(angle / Math.PI)
  let best = angle
  let distance = Infinity
  for (const base of [k - 1, k, k + 1]) {
    for (const side of [-1, 1]) {
      const candidate = base * Math.PI + side * STATEMENT.edge
      if (Math.abs(candidate - angle) < distance) {
        distance = Math.abs(candidate - angle)
        best = candidate
      }
    }
  }
  return best
}

const smooth01 = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** Resting angle: slightly off face-on so the bands catch the light while it dwells. */
const REST = { x: 0.14, y: -0.25 }

/** The calm outside: a flat, bevelled band in the app-icon outline. */
function createFrame() {
  return createBandGeometry(roundedSquareCurve(), {
    width: 0.24,
    depth: 0.15,
    chamfer: 0.055,
    innerChamfer: 0.015,
    segments: 600,
  })
}

/**
 * The inside: a smaller rounded square of the same glass, turned 45° and set back in depth,
 * about half the frame's inner width. Seen through and past the frame, a second layer.
 */
function createInner() {
  return createBandGeometry(roundedSquareCurve(0.64, 0.2), {
    width: 0.13,
    depth: 0.11,
    chamfer: 0.04,
    innerChamfer: 0.014,
    segments: 400,
  })
}

/**
 * "The Core": a hollow glass frame in the app-icon outline (effortless outside) around a
 * second, turned layer inside it (complex inside). Both are flat bands of cut glass: a
 * clear, lightly marked face between crisp bevelled edges. It turns slowly on its own; the
 * cursor adds a small, late tilt that the inner layer leans against.
 */
export function Emblem({ look, pointer, clock, reducedMotion, journey, anchored }: Props) {
  const group = useRef<Group>(null)
  const inner = useRef<Mesh>(null)
  const tilt = useRef({ x: 0, y: 0 })
  /** Spin clock: runs with scene time at the hero, slows to a stop at the statement. */
  const spinClock = useRef({ time: 0, last: 0 })
  /** The edge-on angle held at the statement, picked once as The Core starts to travel. */
  const hold = useRef<number | null>(null)
  const frame = useMemo(() => createFrame(), [])
  const innerShape = useMemo(() => createInner(), [])
  // Created once; the look is applied every frame below so it can be tuned live.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const glass = useMemo(() => createGlassMaterial(look), [])
  useEffect(
    () => () => {
      frame.dispose()
      innerShape.dispose()
      disposeGlassMaterial(glass)
    },
    [frame, innerShape, glass],
  )

  useFrame(({ size, scene }, delta) => {
    if (!group.current || !inner.current) return
    const { emblem } = sceneConfig
    const t = clock.time
    // Heavily damped (~0.8s) so the object feels heavy, as in the reference.
    const ease = 1 - Math.exp(-Math.min(delta, 1 / 30) * 1.3)
    const tiltX = reducedMotion ? 0 : -(pointer.uv.y - 0.5) * emblem.tilt
    const tiltY = reducedMotion ? 0 : (pointer.uv.x - 0.5) * emblem.tilt * 1.4

    tilt.current.x += (tiltX - tilt.current.x) * ease
    tilt.current.y += (tiltY - tilt.current.y) * ease
    // At Contact The Core rises out of the dark (from ~30% into the leg) and spins again,
    // posed exactly as on the hero, so the loop back to the hero is seamless.
    const contact = journey && !anchored ? smooth01((journey.toContact - 0.3) / 0.7) : 0
    // Travels with the objects' slower settle, so it trails the camera down the path.
    const objects = journey ? journey.objects : 0
    const travel = objects * objects * (3 - 2 * objects) * (1 - contact)

    // The idle turn is continuous, never damped: highlights slide along the bands as it
    // turns. It winds down as The Core leaves for the statement.
    const spinClockState = spinClock.current
    spinClockState.time += Math.max(0, t - spinClockState.last) * (1 - travel)
    spinClockState.last = t
    const spin = reducedMotion ? 0 : idleSpin(spinClockState.time, emblem.halfTurn, emblem.dwell)
    const heroTurn = REST.y + tilt.current.y + spin
    if (travel > 0.001) hold.current ??= nearestEdge(heroTurn)
    else hold.current = null
    const heldTurn = (hold.current ?? heroTurn) + Math.sin(t * 0.4) * 0.05 + tilt.current.y * 0.5

    const g = group.current
    // Out of sight down at Work (and no transmission pass for it there).
    g.visible = anchored ? true : !journey || journey.toWork < 0.85 || contact > 0.001
    const heroTiltX = REST.x + tilt.current.x + Math.sin(t * 0.3) * 0.05
    g.rotation.x = heroTiltX + (tilt.current.x * 0.4 - heroTiltX) * travel
    g.rotation.y = heroTurn + (heldTurn - heroTurn) * travel
    // Contact: The Core turns to face the visitor as the camera arrives (back to its own
    // turn over the loop, so the hero is unchanged).
    const greet = contact * (1 - smooth01(journey ? journey.loop * 1.5 : 0))
    if (greet > 0) {
      const faceOn = Math.round(g.rotation.y / Math.PI) * Math.PI + REST.y
      g.rotation.y += (faceOn - g.rotation.y) * greet * 0.9
    }
    g.position.lerpVectors(POSES.hero, POSES.statement, travel)
    g.position.y += statementLift(size.width, size.height) * travel
    // Narrow screens: stay over the (narrower) tagline.
    g.position.x *= Math.min(1, size.width / size.height / 1.6)
    g.position.y += Math.sin(t * 0.5) * emblem.float
    if (contact > 0) g.position.y += PLACES.contact - (1 - contact) * 3.5
    // Portrait screens see a narrower slice of the world: keep the emblem's share of width.
    const portrait = Math.min(1, Math.max(0.55, (size.width / size.height) * 0.9))
    // Leaving the statement: held edge-on, The Core follows the camera down a little and
    // shrinks into a sliver of light instead of being cut off by the frame's top edge.
    const leave = journey && !anchored ? smooth01(journey.toWork / 0.32) * (1 - contact) : 0
    if (leave > 0) g.position.y += (journey!.y - PLACES.statement) * 0.8 * leave
    // Grows back to hero size only once Contact's text has gone (it would cover it).
    const loop = journey ? smooth01((journey.loop - 0.35) / 0.65) : 0
    const heroScale = HERO - (HERO - 1) * contact * (1 - loop)
    g.scale.setScalar(
      emblem.scale *
        portrait *
        (heroScale + (STATEMENT.scale - heroScale) * travel) *
        (1 - leave * 0.94),
    )
    if (anchored) {
      g.position.set(0, Math.sin(t * 0.5) * emblem.float, 0)
      g.scale.setScalar(anchored.scale)
      // At System's centre it is the identity anchor: face-on, swaying only a little.
      g.rotation.set(REST.x * 0.5 + Math.sin(t * 0.3) * 0.05, Math.sin(t * 0.25) * 0.22, 0)
    } else {
      // The preloader's reveal: The Core resolves out of the condensing dust, turning in.
      const reveal = reducedMotion ? revealed(0.6) : revealed(1.1, BURST * 0.55)
      if (reveal < 1) {
        g.visible &&= reveal > 0.001
        g.scale.multiplyScalar(0.001 + 0.999 * reveal)
        g.rotation.y += (1 - reveal) * 2.2
      }
    }

    // The light rig turns part of the way with the emblem near face-on, so the bevels keep
    // mirroring the edge light, and eases back to fixed towards edge-on, where following
    // would put the camera in the edge light's plane and flare the faces. Measured from the
    // nearest face-on angle (the rig looks the same turned half round), so nothing builds up
    // over the endless spin and nothing jumps as it passes edge-on.
    const turn = g.rotation.y
    const facing = Math.round(turn / Math.PI) * Math.PI
    // Order 'YXZ': three applies the negated angles in this order, which makes it the exact
    // inverse of the emblem's own XYZ rotation (with 'XYZ' the tilt flips sign once turned).
    // Down at Work the light stays put (its look was tuned unrotated).
    const away = journey ? Math.max(1 - smooth01(journey.toWork), contact) : 1
    if (!anchored)
      scene.environmentRotation.set(
        g.rotation.x * look.follow * away,
        (facing + (look.follow * Math.sin(2 * (turn - facing))) / 2) * away,
        0,
        'YXZ',
      )

    // The inner layer sways a little and leans against the cursor tilt; its wobble stays
    // small so its bevels keep catching the edge light.
    inner.current.rotation.set(
      Math.sin(t * 0.2) * 0.1 - tilt.current.x * 1.2,
      Math.sin(t * 0.15) * 0.12 - tilt.current.y * 1.2,
      Math.PI / 4 + Math.sin(t * 0.1) * 0.08,
    )

    // Deeper refraction at the statement, so the glass visibly bends the tagline behind it.
    // At the held angle the reflections stay up, so the slit of glass stays bright.
    const faceOn = Math.abs(Math.cos(turn - facing))
    applyGlassLook(glass, look, {
      facing: faceOn + (0.7 - faceOn) * travel,
      depth: 1 + 2 * travel,
      rainbow: travel,
      // A small anchored Core reflects only: no refraction pass (it would re-render the
      // scene for an emblem a few hundred pixels wide).
      reflectOnly: !!anchored || useTier.getState().tier === 'lite',
    })
  })

  return (
    // Over the glass, the custom cursor wobbles (the native cursor is untouched).
    <group
      ref={group}
      onPointerOver={() => useCursor.getState().setScene('glass')}
      onPointerOut={() => useCursor.getState().leave('glass')}
    >
      <mesh geometry={frame} material={glass} />
      <mesh ref={inner} geometry={innerShape} material={glass} position-z={-0.16} />
    </group>
  )
}
