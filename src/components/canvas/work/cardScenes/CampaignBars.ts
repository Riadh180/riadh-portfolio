import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Points,
  ShaderMaterial,
} from 'three'
import { sceneColors } from '@/styles/scene'
import flowFragment from '../../shaders/cardScenes/flow.frag'
import flowVertex from '../../shaders/cardScenes/flow.vert'
import { CARD_TONES, CardScene } from './CardScene'

const BARS = 7
const WIDTH = 0.22
const GAP = 0.34
const POINTS = 1400

/** Ad campaigns (Licht & Schatten): data particles flowing into bar charts. */
export class CampaignBars extends CardScene {
  private group = new Group()
  private bars: Mesh[] = []
  private flow: ShaderMaterial
  private tops = new Array<number>(8).fill(0)

  constructor(detail = 1) {
    super(CARD_TONES.wine, sceneColors.warm)
    const count = POINTS * detail
    const box = this.own(new BoxGeometry(WIDTH, 1, WIDTH))
    box.translate(0, 0.5, 0)
    // Deep wine glass, a warm gold light on the bar tops.
    const material = this.glass(
      [CARD_TONES.wine, sceneColors.ember, sceneColors.warm],
      1.4,
      sceneColors.warm,
    )
    for (let i = 0; i < BARS; i++) {
      const bar = new Mesh(box, material)
      bar.position.x = (i - (BARS - 1) / 2) * GAP
      this.bars.push(bar)
      this.group.add(bar)
    }
    const axis = this.own(new BufferGeometry())
    axis.setAttribute('position', new Float32BufferAttribute([-1.4, 0, 0.2, 1.4, 0, 0.2], 3))
    this.group.add(
      new LineSegments(
        axis,
        this.own(
          new LineBasicMaterial({ color: new Color().copy(sceneColors.glass).multiplyScalar(0.3) }),
        ),
      ),
    )

    const positions = new Float32Array(count * 3)
    const sources = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    const bars = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const bar = Math.floor(Math.random() * BARS)
      bars[i] = bar
      positions.set(
        [
          (bar - (BARS - 1) / 2) * GAP + (Math.random() - 0.5) * WIDTH * 0.8,
          0,
          (Math.random() - 0.5) * WIDTH,
        ],
        i * 3,
      )
      sources.set(
        [-2.4 - Math.random() * 0.8, 0.2 + Math.random() * 1.6, (Math.random() - 0.5) * 0.8],
        i * 3,
      )
      seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
    }
    const geometry = this.own(new BufferGeometry())
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('source', new Float32BufferAttribute(sources, 3))
    geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
    geometry.setAttribute('bar', new Float32BufferAttribute(bars, 1))
    this.flow = this.own(
      new ShaderMaterial({
        vertexShader: flowVertex,
        fragmentShader: flowFragment,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 26 },
          uColors: { value: [CARD_TONES.wine, sceneColors.warm, sceneColors.glow] },
          uTops: { value: this.tops },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    const points = new Points(geometry, this.flow)
    points.frustumCulled = false
    this.group.add(points)
    this.group.position.set(0.65, -0.35, 0)
    this.group.rotation.y = -0.35
    this.scene.add(this.group)
    this.camera.position.set(0, 0.5, 4.4)
    this.camera.lookAt(0.3, 0.35, 0)
  }

  update(time: number) {
    this.bars.forEach((bar, i) => {
      const height =
        0.35 + 0.9 * (0.5 + 0.5 * Math.sin(time * 0.4 + i * 0.9)) * (0.5 + i / BARS / 1.4)
      bar.scale.y = height
      this.tops[i] = height
    })
    this.flow.uniforms.uTime!.value = time
    ;(this.bars[0]?.material as ShaderMaterial).uniforms.uTime!.value = time
  }
}
