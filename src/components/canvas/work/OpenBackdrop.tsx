import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import {
  type Camera,
  Color,
  HalfFloatType,
  type Mesh,
  type Object3D,
  type Points,
  type PerspectiveCamera,
  type Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { useTier } from '@/stores/tier'
import { sceneColors } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import fragmentShader from '../shaders/openBackdrop.frag'
import vertexShader from '../shaders/openBackdrop.vert'
import type { SceneClock } from '../useSceneClock'
import { openView } from './openView'

/**
 * The backdrop's picture of the scene (full tier): a quarter of the screen's resolution (it
 * is blurred anyway), redrawn every other frame (it changes slowly), of the solid things only
 * (the column, the other cards, the haze): point sprites keep their full-screen size in pixels,
 * so in a small picture the dust would swell into bright blobs; behind the smoke it isn't
 * missed (at_08 shows none). `behind`: how far behind the card the backdrop stands.
 */
const PICTURE = { scale: 0.25, every: 2 }
const PLACE = { behind: 0.6, oversize: 1.5 }
/**
 * About half as bright as the open scene was (`keep`: the share of the scene's light left;
 * the grade's lifted blacks set the floor), under a faint smoke of the world's charcoal with
 * a trace of teal (in linear light the teal is ~100× brighter than the charcoal: a trace is
 * ~1%).
 */
const LOOK = { keep: 0.22, smoke: 0.5 }
const SMOKE = new Color().copy(sceneColors.bg).lerp(sceneColors.teal, 0.012).multiplyScalar(2.4)

/** The backdrop's GPU side: its picture of the scene and its material. */
class Backdrop {
  readonly picture = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true })
  readonly material = new ShaderMaterial({
    vertexShader,
    fragmentShader: `${noise}\n${fragmentShader}`,
    uniforms: {
      uScene: { value: this.picture.texture },
      uResolution: { value: new Vector2(1, 1) },
      uTexel: { value: new Vector2(1, 1) },
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uLite: { value: 0 },
      uKeep: { value: LOOK.keep },
      uSmoke: { value: SMOKE },
      uSmokeAmount: { value: LOOK.smoke },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  private frames = 0
  private forward = new Vector3()
  private buffer = new Vector2()
  private hidden: Object3D[] = []

  frame(gl: WebGLRenderer, scene: Scene, camera: Camera, mesh: Mesh, time: number) {
    const { amount, distance, object } = openView
    mesh.visible = amount > 0.001
    if (!mesh.visible) return
    const lite = useTier.getState().tier === 'lite'
    const u = this.material.uniforms

    // Square to the camera, just behind the card, covering the view (with room for the
    // phones' shifted picture).
    const perspective = camera as PerspectiveCamera
    const depth = distance + PLACE.behind
    const height = 2 * depth * Math.tan((perspective.fov * Math.PI) / 360) * PLACE.oversize
    camera.getWorldDirection(this.forward)
    mesh.position.copy(camera.position).addScaledVector(this.forward, depth)
    mesh.quaternion.copy(camera.quaternion)
    mesh.scale.set(height * perspective.aspect, height, 1)

    const buffer = gl.getDrawingBufferSize(this.buffer)
    ;(u.uResolution!.value as Vector2).copy(buffer)
    if (!lite && this.frames++ % PICTURE.every === 0) {
      const width = Math.max(1, Math.round(buffer.x * PICTURE.scale))
      const height = Math.max(1, Math.round(buffer.y * PICTURE.scale))
      if (this.picture.width !== width || this.picture.height !== height) {
        this.picture.setSize(width, height)
      }
      ;(u.uTexel!.value as Vector2).set(1 / width, 1 / height)
      // The scene without the card, this backdrop and the dust.
      const hidden = this.hidden
      hidden.length = 0
      scene.traverseVisible((child) => {
        if ((child as Points).isPoints) hidden.push(child)
      })
      hidden.push(mesh)
      if (object) hidden.push(object)
      for (const child of hidden) child.visible = false
      const previous = gl.getRenderTarget()
      gl.setRenderTarget(this.picture)
      gl.clear()
      gl.render(scene, camera)
      gl.setRenderTarget(previous)
      for (const child of hidden) child.visible = true
    }
    u.uAmount!.value = amount
    u.uLite!.value = lite ? 1 : 0
    u.uTime!.value = time
  }

  dispose() {
    this.picture.dispose()
    this.material.dispose()
  }
}

/**
 * Behind an opened card (or the capstone), the scene falls back into smoke and darkness, as in
 * the reference (at_08), so only the card and its details read: darker (~55%) and softened
 * (full tier: a blurred picture of the scene without the card; lite: darkened), with a slow
 * smoky fog drifting over it. It follows the card in and out (openView), so closing restores
 * the scene smoothly.
 */
export function OpenBackdrop({ clock }: { clock: SceneClock }) {
  const mesh = useRef<Mesh>(null)
  const [backdrop] = useState(() => new Backdrop())
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  useEffect(() => () => backdrop.dispose(), [backdrop])

  useFrame(({ camera }) => {
    if (mesh.current) backdrop.frame(gl, scene, camera, mesh.current, clock.time)
  })

  return (
    <mesh ref={mesh} visible={false} frustumCulled={false} material={backdrop.material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
