import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { compileForTarget } from '../../compile'
import dotsFragment from '../../shaders/cardScenes/dots.frag'
import dotsVertex from '../../shaders/cardScenes/dots.vert'
import glassRimFragment from '../../shaders/cardScenes/glassRim.frag'
import glassRimVertex from '../../shaders/cardScenes/glassRim.vert'
import skyFragment from '../../shaders/cardScenes/sky.frag'
import skyVertex from '../../shaders/cardScenes/sky.vert'

/** The texture size: the card's aspect, sharp enough for the opened card. */
const SIZE = { width: 768, height: 480 }

/**
 * A small live 3D scene rendered into a texture, shown inside a job card (under its
 * frost). Original, abstract scenes in the site's style for the jobs whose real work is
 * confidential. Rendered only while its card is visible.
 */
const WHITE = new Color(1, 1, 1)

/**
 * The card family's tones, derived from the palette (the reference's cards: muted teal,
 * deep wine, slate, a little gold): wine for warm accents, slate-teal for dark bodies,
 * silver-teal for cool glass.
 */
export const CARD_TONES = {
  wine: new Color().copy(sceneColors.ember).lerp(sceneColors.violet, 0.25).multiplyScalar(0.55),
  slate: new Color().copy(sceneColors.teal).lerp(sceneColors.glass, 0.25).multiplyScalar(0.45),
  silver: new Color().copy(sceneColors.glass).lerp(sceneColors.teal, 0.3),
}

export abstract class CardScene {
  readonly target = new WebGLRenderTarget(SIZE.width, SIZE.height, { samples: 2 })
  protected readonly scene = new Scene()
  protected readonly camera = new PerspectiveCamera(32, SIZE.width / SIZE.height, 0.1, 50)
  private readonly disposables: { dispose: () => void }[] = [this.target]

  constructor(lowerLeft: Color, upperRight: Color = sceneColors.teal) {
    const sky = new ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: {
        uBase: { value: sceneColors.bg.clone().lerp(lowerLeft, 0.06) },
        uLowerLeft: { value: lowerLeft },
        uUpperRight: { value: upperRight },
      },
      depthWrite: false,
    })
    // Closer: the subject fills more of the card.
    this.camera.zoom = 1.3
    this.camera.updateProjectionMatrix()
    const backdrop = new Mesh(this.own(new PlaneGeometry(2, 2)), this.own(sky))
    backdrop.frustumCulled = false
    backdrop.renderOrder = -1
    this.scene.add(backdrop)
  }

  /** Advances the scene to `time` (seconds). */
  abstract update(time: number): void

  render(gl: WebGLRenderer, time: number) {
    this.update(time)
    const previous = gl.getRenderTarget()
    gl.setRenderTarget(this.target)
    // The post stack turns the renderer's auto-clear off: clear explicitly, or the last
    // frames' colour and depth stay and moving things smear.
    gl.clear(true, true, true)
    gl.render(this.scene, this.camera)
    gl.setRenderTarget(previous)
  }

  /**
   * The scene and its camera at `time`, to be drawn elsewhere: the offline card loops
   * (scripts/loops) render them at video size with their own finish.
   */
  view(time: number) {
    this.update(time)
    return { scene: this.scene, camera: this.camera }
  }

  /** Compiles the scene's shaders ahead of time (in parallel where supported), so the
   * first frame it shows doesn't stall. */
  precompile(gl: WebGLRenderer) {
    return compileForTarget(gl, this.scene, this.camera)
  }

  dispose() {
    this.disposables.forEach((item) => item.dispose())
  }

  /** Tracks a geometry or material for disposal. */
  protected own<T extends { dispose: () => void }>(item: T) {
    this.disposables.push(item)
    return item
  }

  /** The card scenes' glass: dark body, palette rim (no environment needed), and a soft
   * light along its top faces (white unless given). */
  protected glass(rim: [Color, Color, Color], glow = 1.2, top: Color = WHITE) {
    return this.own(
      new ShaderMaterial({
        vertexShader: glassRimVertex,
        fragmentShader: glassRimFragment,
        uniforms: {
          uBase: { value: sceneColors.bg.clone().multiplyScalar(1.6) },
          uRim: { value: rim },
          uGlow: { value: glow * 1.5 },
          uTop: { value: top },
          uTime: { value: 0 },
        },
      }),
    )
  }

  /** Twinkling round points at the given positions. */
  protected dots(positions: number[], colors: [Color, Color, Color], size: number, opacity = 1) {
    const count = positions.length / 3
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const geometry = this.own(new BufferGeometry())
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 4))
    const material = this.own(
      new ShaderMaterial({
        vertexShader: dotsVertex,
        fragmentShader: dotsFragment,
        uniforms: {
          uSize: { value: size },
          uTime: { value: 0 },
          uColors: { value: colors },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    return new Points(geometry, material)
  }
}
