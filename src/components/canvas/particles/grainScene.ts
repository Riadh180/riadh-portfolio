import {
  type Camera,
  HalfFloatType,
  type Object3D,
  type Points,
  type Scene,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { grainUniforms } from './CursorField'

/** The picture's share of the frame's resolution (inside a bead it is magnified anyway). */
const SCALE = 0.35

/**
 * What the glass beads refract (full tier, at Work): a low-resolution picture of the frame
 * without its particles (the column, the cards, the air), taken each frame just before the
 * frame is drawn; glassGrain.glsl bends it through the medium and large beads. Off, the beads
 * keep their own light only (lite, phones, the other places).
 */
export class GrainScene {
  private target = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
  private hidden: Object3D[] = []
  private buffer = new Vector2()

  constructor() {
    grainUniforms.uGrainScene.value = this.target.texture
  }

  /** Takes this frame's picture and turns the refraction on. */
  take(gl: WebGLRenderer, scene: Scene, camera: Camera) {
    const buffer = gl.getDrawingBufferSize(this.buffer)
    const width = Math.max(1, Math.round(buffer.x * SCALE))
    const height = Math.max(1, Math.round(buffer.y * SCALE))
    if (this.target.width !== width || this.target.height !== height) {
      this.target.setSize(width, height)
    }
    // Without the particles: a bead never refracts itself or its neighbours' light.
    const hidden = this.hidden
    hidden.length = 0
    scene.traverseVisible((child) => {
      if ((child as Points).isPoints) hidden.push(child)
    })
    for (const child of hidden) child.visible = false
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(this.target)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(previous)
    for (const child of hidden) child.visible = true
    grainUniforms.uGrainResolution.value.copy(buffer)
    grainUniforms.uGrainSceneOn.value = 1
  }

  off() {
    grainUniforms.uGrainSceneOn.value = 0
  }

  dispose() {
    this.off()
    if (grainUniforms.uGrainScene.value === this.target.texture) {
      grainUniforms.uGrainScene.value = null
    }
    this.target.dispose()
  }
}
