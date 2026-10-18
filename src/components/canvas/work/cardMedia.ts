import { type ShaderMaterial, SRGBColorSpace, VideoTexture, type WebGLRenderer } from 'three'
import type { CardFace } from './cardFace'
import type { CardScene } from './cardScenes'

/** A card's loop files in public/work/<slug>/ (scripts/make-loops.mjs, record-dashboard.mjs). */
export const loopFiles = (slug: string) => ({
  poster: `/work/${slug}/poster.jpg`,
  sources: (small: boolean) => {
    const base = `/work/${slug}/loop${small ? '-640' : ''}`
    return [
      { src: `${base}.webm`, type: 'video/webm; codecs="vp9"' },
      { src: `${base}.mp4`, type: 'video/mp4' },
    ]
  },
})

/**
 * A video texture that uploads a frame only when asked. Three's VideoTexture uploads every new
 * frame the video draws (and only it gets the video's own size and mutable storage): here the
 * video's frame callback just marks a frame pending, and `upload()` sends it.
 */
class VideoFrames extends VideoTexture {
  pending = false

  override set needsUpdate(value: boolean) {
    if (value) this.pending = true
  }

  /** Uploads the pending frame, if there is one. */
  upload() {
    if (!this.pending) return
    this.pending = false
    super.needsUpdate = true
  }
}

/**
 * A card's moving imagery: a short silent loop (1280×800, or 640×400 on the lite tier and
 * phones) shown as a texture under the card's frost. Nothing downloads until the card first
 * asks for it (its poster shows until then and until the first frame is decoded); it plays
 * while the card can be seen and pauses otherwise. The texture takes a new frame only when
 * the card says so (every frame when focused or open, less often at rest) and only if the
 * video has drawn one since.
 */
export class CardVideo {
  readonly texture: VideoFrames
  /** True once a frame can be drawn. */
  ready = false
  private video = document.createElement('video')
  private loading = false

  constructor(private slug: string) {
    const video = this.video
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'none'
    video.disablePictureInPicture = true
    this.texture = new VideoFrames(video)
    this.texture.colorSpace = SRGBColorSpace
  }

  /** Starts the download (once): the small file on the lite tier and phones. */
  load(small: boolean) {
    if (this.loading) return
    this.loading = true
    const video = this.video
    for (const { src, type } of loopFiles(this.slug).sources(small)) {
      const source = document.createElement('source')
      source.src = src
      source.type = type
      video.append(source)
    }
    video.addEventListener('loadeddata', () => {
      this.ready = true
      this.texture.pending = true
    })
    video.preload = 'auto'
    video.load()
  }

  /** Plays while `on`, pauses otherwise (and stays paused until loaded). */
  play(on: boolean) {
    if (!this.loading || on === !this.video.paused) return
    if (on) void this.video.play().catch(() => undefined)
    else this.video.pause()
  }

  /** Uploads the latest frame, if the card is due one and the video has drawn one since. */
  update(due: boolean) {
    if (this.ready && due) this.texture.upload()
  }

  dispose() {
    this.video.pause()
    this.video.replaceChildren()
    this.video.removeAttribute('src')
    this.video.load()
    this.texture.dispose()
  }
}

/**
 * What a card shows under its frost: its video loop, its live scene (a confidential job
 * without a loop), or neither: the cover, poster or placeholder drawn on its face.
 */
export type CardMedia = { video: CardVideo | null; live: CardScene | null }

export const NO_MEDIA: CardMedia = { video: null, live: null }

/** Whether an object and all its parents are visible. */
export function shown(object: { visible: boolean; parent: unknown } | null): boolean {
  let node = object as { visible: boolean; parent: unknown } | null
  while (node) {
    if (!node.visible) return false
    node = node.parent as typeof node
  }
  return true
}

type Step = {
  gl: WebGLRenderer
  time: number
  /** The card can be seen (in the frame, its place shown, not hidden behind an open card). */
  seen: boolean
  /** It is due a new frame (every frame when focused or open, less often at rest). */
  due: boolean
  /** The lite tier or a phone: the small loop. */
  small: boolean
  /** Reduced motion: the poster, still. */
  still: boolean
}

/**
 * One frame of a card's media. The loop loads the first time its card is seen, plays while it
 * is seen and takes a new frame when due; the live scene renders when due and seen. The
 * screen (and the dust it breaks into) then show the loop once it has a frame (the poster on
 * the face until then, and always with reduced motion), else the live scene, else the face.
 * The loop and the live scene come unshaded and unfrosted: the screen shades and clears them.
 */
export function stepMedia(
  { video, live }: CardMedia,
  face: CardFace,
  materials: (ShaderMaterial | undefined)[],
  { gl, time, seen, due, small, still }: Step,
) {
  if (video) {
    if (seen && !still) video.load(small)
    video.play(seen && !still)
    video.update(due)
  }
  if (live && due && seen) live.render(gl, time)
  const playing = !!video?.ready && !still
  const image = playing ? video.texture : live ? live.target.texture : face.image
  for (const material of materials) {
    const u = material?.uniforms
    if (!u) continue
    u.uImage!.value = image
    if (u.uDecode) u.uDecode.value = playing ? 1 : 0
    if (u.uShade) u.uShade.value = playing || live ? 1 : 0
    if (u.uClarity) u.uClarity.value = video || live || face.clear ? 1 : 0
  }
}
