import {
  Camera,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import noise from '../shaders/noise.glsl'
import slab from '../shaders/slab.glsl'
import fragmentShader from '../shaders/slabField.frag'
import vertexShader from '../shaders/slabField.vert'

/**
 * The slab's smoke, baked into a small texture (R density, G wisps) once per frame. The
 * smoke drifts slowly, so 512×256 texels are plenty, and every screen pixel of the smoke
 * layers and every mote then costs one texture read instead of several noise evaluations.
 */
export class SlabField {
  readonly texture: Texture
  private target = new WebGLRenderTarget(512, 256, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })
  private scene = new Scene()
  private camera = new Camera()
  private material: ShaderMaterial

  constructor(extent: [number, number], centerZ: number) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader: `${noise}\n${slab}\n${fragmentShader}`,
      uniforms: {
        uTime: { value: 0 },
        uExtent: { value: extent },
        uCenterZ: { value: centerZ },
      },
      depthTest: false,
      depthWrite: false,
    })
    const quad = new Mesh(new PlaneGeometry(2, 2), this.material)
    quad.frustumCulled = false
    this.scene.add(quad)
    this.texture = this.target.texture
  }

  update(gl: WebGLRenderer, time: number) {
    this.material.uniforms.uTime!.value = time
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(this.target)
    gl.render(this.scene, this.camera)
    gl.setRenderTarget(previous)
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
    this.scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose()
    })
  }
}
