// The offline stage for the card loops (look round, Stage 2). scripts/make-loops.mjs bundles it
// and drives it from headless Chrome one frame at a time: `loops.setup(name, period, detail)`
// builds a loop's picture in a fresh canvas#frame (1280×800, the card's 16:10),
// `loops.frame(t)` draws it t seconds in.
//
// - The confidential jobs (and Freelance): the card's own live scene (cardScenes/), with more
//   particles (`detail`) and a filmic finish: a slow camera drift that repeats every period, depth of
//   field on the subject, bloom on the highlights, a soft light sweep once per loop and a
//   vignette (the encoder adds the grain). Abstract and illustrative only, as the live card was.
// - Bliggit: its two real screenshots in the card's phone composition, alive (phones.ts).
import {
  BloomEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  RenderPass,
  VignetteEffect,
} from 'postprocessing'
import {
  HalfFloatType,
  NoToneMapping,
  Points,
  type ShaderMaterial,
  SRGBColorSpace,
  Uniform,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createCardScene } from '@/components/canvas/work/cardScenes'
import { drawPhones } from './phones'

const WIDTH = 1280
const HEIGHT = 800
/** The live card texture's width: the scenes' point sizes are in its pixels. */
const CARD_WIDTH = 768
/** Scene time runs at half speed: calmer, and the seam crossfades two close views. */
const PACE = 0.5
/** How far ahead of the camera its subject sits (the scenes frame it at ~4.2–4.6). */
const SUBJECT = 4.3

/** A soft band of light crossing the picture once per loop (`uAt`: where, along the diagonal). */
class SweepEffect extends Effect {
  constructor() {
    super(
      'SweepEffect',
      `uniform float uAt;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float d = uv.x * 0.8 + uv.y * 0.45 - uAt;
        float band = exp(-d * d / 0.01);
        outputColor = vec4(inputColor.rgb * (1.0 + band * 0.25) + vec3(1.0, 0.93, 0.85) * band * 0.012, inputColor.a);
      }`,
      { uniforms: new Map([['uAt', new Uniform(-1)]]) },
    )
  }
}

type Stage = { draw: (t: number) => void }
let stage: Stage | null = null

/** A new canvas#frame at the loop's size (the old one, and its context, go). */
function freshCanvas() {
  document.getElementById('frame')?.remove()
  const canvas = document.createElement('canvas')
  canvas.id = 'frame'
  canvas.width = WIDTH
  canvas.height = HEIGHT
  document.body.append(canvas)
  return canvas
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

async function phones(period: number): Promise<Stage> {
  const images = (await Promise.all(
    ['/work/bliggit/cover.png', '/work/bliggit/login.png'].map(load),
  )) as [HTMLImageElement, HTMLImageElement]
  const context = freshCanvas().getContext('2d')
  if (!context) throw new Error('no 2D canvas')
  return { draw: (t) => drawPhones(context, images, t, period) }
}

function scene(slug: string, period: number, detail: number): Stage {
  const card = createCardScene(slug, detail)
  if (!card) throw new Error(`no live scene for ${slug}`)
  const renderer = new WebGLRenderer({ canvas: freshCanvas(), preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(WIDTH, HEIGHT, false)
  renderer.outputColorSpace = SRGBColorSpace
  // As in the card: the scene's own values, not tone-mapped.
  renderer.toneMapping = NoToneMapping
  const { scene: world, camera } = card.view(0)
  // Point sizes are in pixels of the card's texture: the same look at video size.
  world.traverse((object) => {
    const uniforms = object instanceof Points ? (object.material as ShaderMaterial).uniforms : null
    if (uniforms?.uSize) uniforms.uSize.value *= WIDTH / CARD_WIDTH
  })
  // The camera drifts round its own pose (sideways, a little up and down, in and out) and
  // keeps the subject in frame and in focus; the drift repeats every period.
  const base = camera.position.clone()
  const forward = camera.getWorldDirection(new Vector3())
  const target = base.clone().addScaledVector(forward, SUBJECT)
  const right = new Vector3().crossVectors(forward, camera.up).normalize()
  const up = new Vector3().crossVectors(right, forward).normalize()

  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 4,
  })
  composer.addPass(new RenderPass(world, camera))
  // The whole subject in focus (it is ~2 units deep; the opened card shows it sharp), the
  // backdrop and anything far off it soft.
  const focus = new DepthOfFieldEffect(camera, {
    focusDistance: SUBJECT,
    focusRange: 3.2,
    bokehScale: 2,
  })
  focus.target = target
  composer.addPass(new EffectPass(camera, focus))
  const sweep = new SweepEffect()
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({ luminanceThreshold: 0.55, intensity: 0.4, mipmapBlur: true }),
      sweep,
      new VignetteEffect({ offset: 0.3, darkness: 0.55 }),
    ),
  )
  return {
    draw(t) {
      const phase = ((t % period) / period) * Math.PI * 2
      camera.position
        .copy(base)
        .addScaledVector(right, Math.sin(phase) * 0.22)
        .addScaledVector(up, Math.sin(phase * 2 + 0.6) * 0.06)
        .addScaledVector(forward, (1 - Math.cos(phase)) * 0.2)
      camera.lookAt(target)
      card.view(t * PACE)
      sweep.uniforms.get('uAt')!.value = -0.4 + 2.1 * ((t % period) / period)
      composer.render(1 / 30)
    },
  }
}

declare global {
  interface Window {
    loops: {
      setup: (name: string, period: number, detail: number) => Promise<void>
      frame: (t: number) => void
    }
  }
}

window.loops = {
  async setup(name, period, detail) {
    stage = name === 'bliggit' ? await phones(period) : scene(name, period, detail)
  },
  frame(t) {
    stage?.draw(t)
  },
}
