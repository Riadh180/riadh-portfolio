import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, type Group, type Mesh, type ShaderMaterial, Vector3 } from 'three'
import { sceneColors } from '@/styles/scene'
import { type JourneyState, PLACES, WORK } from '../journey/path'
import fragmentShader from '../shaders/lensShard.frag'
import vertexShader from '../shaders/glow.vert'
import { SPIRAL } from './layout'

/** Panel size (world units) and how far in front of the camera's stop it hangs. */
const SHARD = { width: 1.7, height: 1.1, ahead: 1.7 }

/**
 * Out-of-focus glass panels right in front of the lens (the reference's foreground
 * cards): one near each card stop, off to one side and above or below, so as the camera
 * moves down the column they slide past, cut by the frame. Desktop only.
 */
export function LensShards({ journey }: { journey: JourneyState }) {
  const group = useRef<Group>(null)
  const column = useThree((state) => state.size.width < 700)
  const poses = useMemo(
    () =>
      Array.from({ length: WORK.cards }, (_, i) => {
        const angle = (i / (WORK.cards - 1)) * SPIRAL
        const side = i % 2 === 0 ? 1 : -1
        const lift = i % 3 === 0 ? 0.3 : -0.32
        return { angle, side, lift, index: i }
      }),
    [],
  )
  const uniforms = useMemo(
    () =>
      poses.map((pose, i) => ({
        uColors: {
          value:
            i % 2
              ? [sceneColors.violet, sceneColors.pink, sceneColors.teal]
              : [sceneColors.teal, sceneColors.glow, sceneColors.violet],
        },
        uOpacity: { value: 1 },
        uSize: { value: [SHARD.width, SHARD.height] },
      })),
    [poses],
  )
  const scratch = useMemo(
    () => ({
      camera: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      screen: new Vector3(),
    }),
    [],
  )

  useFrame(({ camera }) => {
    const g = group.current
    if (!g) return
    g.visible = !column && journey.toWork > 0.9 && journey.toSystem < 0.15
    if (!g.visible) return
    g.children.forEach((child, i) => {
      const pose = poses[i]
      if (!pose) return
      const y = PLACES.work + journey.cardY(pose.index)
      const { angle } = pose
      // Where the camera holds at this stop (dollied in).
      const held = WORK.distance - WORK.dolly
      scratch.camera.set(Math.sin(angle) * held, y, Math.cos(angle) * held)
      scratch.forward.set(-Math.sin(angle), 0, -Math.cos(angle))
      scratch.right.set(Math.cos(angle), 0, -Math.sin(angle))
      child.position
        .copy(scratch.camera)
        .addScaledVector(scratch.forward, SHARD.ahead)
        .addScaledVector(scratch.right, pose.side * 1.3)
      child.position.y += pose.lift
      // Fades as the lens nearly touches it (between stops the camera passes close by):
      // a soft pane at the edge, never a wash over the frame.
      const near = child.position.distanceTo(camera.position)
      const material = (child as Mesh).material as ShaderMaterial
      // Only at the frame's edges: fades out as it drifts towards the middle.
      scratch.screen.copy(child.position).project(camera)
      const edge = Math.min(1, Math.max(0, (Math.abs(scratch.screen.x) - 0.45) / 0.3))
      material.uniforms.uOpacity!.value = Math.min(1, Math.max(0, (near - 1.1) / 0.6)) * edge
      child.lookAt(camera.position)
      child.rotateZ(pose.side * 0.12)
    })
  })

  return (
    <group ref={group} visible={false}>
      {poses.map((pose, i) => (
        <mesh key={pose.index} frustumCulled={false} renderOrder={10}>
          <planeGeometry args={[SHARD.width, SHARD.height]} />
          <shaderMaterial
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms[i]}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  )
}
