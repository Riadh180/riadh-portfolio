import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Mesh, Vector3 } from 'three'
import { sceneConfig } from '@/styles/scene'
import { type JourneyState, PLACES } from '../journey/path'
import type { Pointer } from '../usePointer'
import type { SceneClock } from '../useSceneClock'
import { createBandGeometry, roundedSquareCurve } from './bandGeometry'
import type { GlassLook } from './glassLook'
import { applyGlassLook, createGlassMaterial, disposeGlassMaterial } from './glassMaterial'
import { idleSpin } from './motion'

type Props = {
  look: GlassLook
  pointer: Pointer
  clock: SceneClock
  reducedMotion: boolean
  /** Where the visitor is on the camera path; omitted, the emblem stays at the hero. */
  journey?: JourneyState
}

/**
 * Where The Core floats at each place. At the statement it has come closer and stands in
 * front of the tagline's right end, so its glass bends the type behind it.
 */
const POSES = {
  hero: new Vector3(0, 0.15, 0),
  statement: new Vector3(-0.2, PLACES.statement - 0.65, 3),
}

/**
 * At the statement The Core stops spinning and holds near edge-on (a tall slit of thick
 * glass with rainbow edges, like the reference disc), upright and larger, spanning all
 * three tagline lines.
 */
const STATEMENT = { scale: 1.45, edge: 1.1 }

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

/** Resting angle: slightly off face-on so the bands catch the light while it dwells. */
const REST = { x: 0.14, y: -0.25 }

/** The calm outside: a flat, bevelled band in the app-icon outline. */
function createFrame() {
  return createBandGeometry(roundedSquareCurve(), {
    width: 0.22,
    depth: 0.08,
    chamfer: 0.04,
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
    width: 0.12,
    depth: 0.07,
    chamfer: 0.035,
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
export function Emblem({ look, pointer, clock, reducedMotion, journey }: Props) {
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
    // Travels with the objects' slower settle, so it trails the camera down the path.
    const travel = journey ? journey.objects * journey.objects * (3 - 2 * journey.objects) : 0

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
    g.visible = !journey || journey.toWork < 0.85
    const heroTiltX = REST.x + tilt.current.x + Math.sin(t * 0.3) * 0.05
    g.rotation.x = heroTiltX + (tilt.current.x * 0.4 - heroTiltX) * travel
    g.rotation.y = heroTurn + (heldTurn - heroTurn) * travel
    g.position.lerpVectors(POSES.hero, POSES.statement, travel)
    // Narrow screens: stay over the (narrower) tagline.
    g.position.x *= Math.min(1, size.width / size.height / 1.6)
    g.position.y += Math.sin(t * 0.5) * emblem.float
    // Portrait screens see a narrower slice of the world: keep the emblem's share of width.
    const portrait = Math.min(1, Math.max(0.55, (size.width / size.height) * 0.9))
    g.scale.setScalar(emblem.scale * portrait * (1 + (STATEMENT.scale - 1) * travel))

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
    const away = journey ? 1 - (1 - Math.cos(Math.PI * journey.toWork)) / 2 : 1
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
    })
  })

  return (
    <group ref={group}>
      <mesh geometry={frame} material={glass} />
      <mesh ref={inner} geometry={innerShape} material={glass} position-z={-0.16} />
    </group>
  )
}
