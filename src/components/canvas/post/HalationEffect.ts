import { BlendFunction, Effect } from 'postprocessing'
import { Uniform } from 'three'
import { sceneColors } from '@/styles/scene'
import fragmentShader from '../shaders/halation.frag'

/** Warm halo round the brightest highlights (glass edges, sparks). Full tier only. */
export class HalationEffect extends Effect {
  constructor() {
    super('HalationEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uThreshold', new Uniform(1.1)],
        ['uStrength', new Uniform(0.35)],
        ['uTint', new Uniform(sceneColors.warm.clone().lerp(sceneColors.ember, 0.5))],
      ]),
    })
  }
}
