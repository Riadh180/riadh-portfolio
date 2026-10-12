import { Effect } from 'postprocessing'
import { Uniform } from 'three'
import { sceneConfig } from '@/styles/scene'
import fragmentShader from '../shaders/grade.frag'

/** Final look: contrast curve, vignette, film grain and dithering. */
export class GradeEffect extends Effect {
  private readonly contrast = new Uniform(1)
  private readonly grain = new Uniform(0)
  private readonly vignette = new Uniform(0)

  constructor() {
    super('GradeEffect', fragmentShader)
    this.uniforms.set('uContrast', this.contrast)
    this.uniforms.set('uGrain', this.grain)
    this.uniforms.set('uVignette', this.vignette)
  }

  override update() {
    const { contrast, grain, vignette } = sceneConfig.grade
    this.contrast.value = contrast
    this.grain.value = grain
    this.vignette.value = vignette
  }
}
