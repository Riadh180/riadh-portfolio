import { Effect } from 'postprocessing'
import { Color, Uniform } from 'three'
import { sceneColors, sceneConfig } from '@/styles/scene'
import fragmentShader from '../shaders/grade.frag'

/** The one grade: contrast, saturation, split-tone, lift, vignette, grain, dither. */
export class GradeEffect extends Effect {
  private readonly contrast = new Uniform(1)
  private readonly grain = new Uniform(0)
  private readonly vignette = new Uniform(0)
  private readonly lift = new Uniform(new Color())
  private readonly shadowTint = new Uniform(new Color())
  private readonly shadowAmount = new Uniform(0)
  private readonly saturation = new Uniform(1)
  private readonly saturationCeiling = new Uniform(1)

  constructor() {
    super('GradeEffect', fragmentShader)
    this.uniforms.set('uContrast', this.contrast)
    this.uniforms.set('uGrain', this.grain)
    this.uniforms.set('uVignette', this.vignette)
    this.uniforms.set('uLift', this.lift)
    this.uniforms.set('uShadowTint', this.shadowTint)
    this.uniforms.set('uShadowAmount', this.shadowAmount)
    this.uniforms.set('uSaturation', this.saturation)
    this.uniforms.set('uSaturationCeiling', this.saturationCeiling)
  }

  override update() {
    const g = sceneConfig.grade
    this.contrast.value = g.contrast
    this.grain.value = g.grain
    this.vignette.value = g.vignette
    // The lift colour is the background token, in linear light, scaled to a floor.
    this.lift.value.copy(sceneColors.bg).multiplyScalar(g.lift)
    // The reference's blacks lean cool teal-grey, never violet (that lives in the haze).
    this.shadowTint.value.copy(sceneColors.teal).lerp(sceneColors.glass, 0.4)
    this.shadowAmount.value = g.shadowTint
    this.saturation.value = g.saturation
    this.saturationCeiling.value = g.saturationCeiling
  }
}
