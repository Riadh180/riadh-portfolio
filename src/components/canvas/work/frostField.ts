import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import frostFieldFragment from '../shaders/frostField.frag'
import frostVertex from '../shaders/frost.vert'
import noise from '../shaders/noise.glsl'

/** Resolution of the baked relief: the cells are coarse, this is plenty. */
const SIZE = { width: 512, height: 320 }

/**
 * A card's cast-glass relief, baked once into a texture (it never changes), so the frost
 * costs one lookup per pixel instead of several noise evaluations: on integrated GPUs
 * that was the cards' biggest cost.
 */
export class FrostField {
  readonly target = new WebGLRenderTarget(SIZE.width, SIZE.height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })
  private baked = false

  constructor(private seed: number) {}

  bake(gl: WebGLRenderer) {
    if (this.baked) return
    this.baked = true
    const material = new ShaderMaterial({
      vertexShader: frostVertex,
      fragmentShader: `${noise}\n${frostFieldFragment}`,
      uniforms: { uSeed: { value: this.seed } },
    })
    const geometry = new PlaneGeometry(2, 2)
    const scene = new Scene().add(new Mesh(geometry, material))
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 0.5
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(this.target)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(previous)
    material.dispose()
    geometry.dispose()
  }

  dispose() {
    this.target.dispose()
  }
}
