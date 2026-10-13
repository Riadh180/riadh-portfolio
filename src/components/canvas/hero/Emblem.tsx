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
  statement: new Vector3(0.6, PLACES.statement - 0.65, 3),
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
    // The idle turn is continuous, never damped: highlights slide along the bands as it turns.
    const spin = reducedMotion ? 0 : idleSpin(t, emblem.halfTurn, emblem.dwell)

    const g = group.current
    g.rotation.x = REST.x + tilt.current.x + Math.sin(t * 0.3) * 0.05
    g.rotation.y = REST.y + tilt.current.y + spin
    // Travels with the objects' slower settle, so it trails the camera down the path.
    const travel = journey ? journey.objects * journey.objects * (3 - 2 * journey.objects) : 0
    g.position.lerpVectors(POSES.hero, POSES.statement, travel)
    // Narrow screens: stay over the (narrower) tagline.
    g.position.x *= Math.min(1, size.width / size.height / 1.6)
    g.position.y += Math.sin(t * 0.5) * emblem.float
    // Portrait screens see a narrower slice of the world: keep the emblem's share of width.
    g.scale.setScalar(emblem.scale * Math.min(1, Math.max(0.55, (size.width / size.height) * 0.9)))

    // The light rig turns part of the way with the emblem near face-on, so the bevels keep
    // mirroring the edge light, and eases back to fixed towards edge-on, where following
    // would put the camera in the edge light's plane and flare the faces. Measured from the
    // nearest face-on angle (the rig looks the same turned half round), so nothing builds up
    // over the endless spin and nothing jumps as it passes edge-on.
    const turn = g.rotation.y
    const facing = Math.round(turn / Math.PI) * Math.PI
    // Order 'YXZ': three applies the negated angles in this order, which makes it the exact
    // inverse of the emblem's own XYZ rotation (with 'XYZ' the tilt flips sign once turned).
    scene.environmentRotation.set(
      g.rotation.x * look.follow,
      facing + (look.follow * Math.sin(2 * (turn - facing))) / 2,
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
    applyGlassLook(glass, look, {
      facing: Math.abs(Math.cos(turn - facing)),
      depth: 1 + 2 * travel,
    })
  })

  return (
    <group ref={group}>
      <mesh geometry={frame} material={glass} />
      <mesh ref={inner} geometry={innerShape} material={glass} position-z={-0.16} />
    </group>
  )
}
