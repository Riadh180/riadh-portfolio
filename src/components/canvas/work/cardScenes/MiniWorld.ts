import { ExtrudeGeometry, Group, Mesh, type ShaderMaterial } from 'three'
import { sceneColors } from '@/styles/scene'
import { roundedRectShape } from '../../hero/bandGeometry'
import { CardScene } from './CardScene'

/** A rounded band: the outer shape minus an inner one (The Core's outline). */
function band(size: number, width: number, depth: number) {
  const shape = roundedRectShape(size, size, size * 0.28)
  const hole = roundedRectShape(size - width * 2, size - width * 2, (size - width * 2) * 0.24)
  shape.holes.push(hole)
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.4,
    bevelSize: width * 0.3,
    bevelSegments: 4,
    curveSegments: 20,
  }).center()
}

/** Freelance creative dev: a mini version of this site's world, a tiny Core in its dust. */
export class MiniWorld extends CardScene {
  private core = new Group()
  private inner: Mesh
  private dust: ReturnType<CardScene['dots']>
  private material: ShaderMaterial

  constructor() {
    super(sceneColors.violet, sceneColors.teal)
    this.material = this.glass([sceneColors.glow, sceneColors.violet, sceneColors.pink], 1.5)
    const outer = new Mesh(this.own(band(1.1, 0.14, 0.12)), this.material)
    this.inner = new Mesh(this.own(band(0.42, 0.07, 0.08)), this.material)
    this.inner.rotation.z = Math.PI / 4
    this.core.add(outer, this.inner)
    this.core.position.set(0.55, 0.25, 0)

    const positions: number[] = []
    for (let i = 0; i < 900; i++) {
      const r = 0.9 + Math.random() ** 2 * 1.8
      const a = Math.random() * Math.PI * 2
      positions.push(Math.cos(a) * r, (Math.random() - 0.5) * 1.2 * (r / 2), Math.sin(a) * r)
    }
    this.dust = this.dots(
      positions,
      [sceneColors.teal, sceneColors.violet, sceneColors.warm],
      14,
      0.8,
    )
    this.dust.position.copy(this.core.position)
    this.scene.add(this.core, this.dust)
    this.camera.position.set(0, 0.35, 4.6)
    this.camera.lookAt(0.3, 0.15, 0)
  }

  update(time: number) {
    // The Core's own turn: lingering face-on, passing quickly through edge-on.
    const turn = time * 0.8
    this.core.rotation.y = turn - Math.sin(turn * 2) * 0.35
    this.inner.rotation.x = Math.sin(time * 0.6) * 0.4
    this.dust.rotation.y = time * 0.05
    this.material.uniforms.uTime!.value = time
    ;(this.dust.material as ShaderMaterial).uniforms.uTime!.value = time
  }
}
