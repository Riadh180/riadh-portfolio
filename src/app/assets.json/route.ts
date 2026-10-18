import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { capstone, jobs } from '@/content/site'

const COVERS = ['cover.webp', 'cover.jpg', 'cover.png']
const IMAGES = /\.(webp|jpe?g|png|svg)$/i
/** A card's video loop: every file of it (scripts/make-loops.mjs, record-dashboard.mjs). */
const LOOP = ['loop.mp4', 'loop.webm', 'loop-640.mp4', 'loop-640.webm', 'poster.jpg']

/**
 * Which optional media is present in public/ (prerendered at build): the sculpted column
 * (public/models/spine.glb and spine-lite.glb, see scripts/build-spine.mjs), each job's and
 * the capstone's cover (public/work/<slug>/cover.webp|jpg|png), the cards with a video loop
 * (public/work/<slug>/loop.*) and the capstone's gallery (its loop, then every image in its
 * folder, the cover first: drop a new screenshot in and rebuild).
 * The scene asks this instead of probing for files, so missing media is never a failed
 * request; it falls back to the procedural stand-in or a placeholder.
 */
export function GET() {
  const exists = (...path: string[]) => existsSync(join(process.cwd(), 'public', ...path))
  const work = Object.fromEntries(
    [...jobs, capstone].map((job) => {
      const cover = [job.coverFile, ...COVERS].find(
        (file) => file && exists('work', job.slug, file),
      )
      return [job.slug, cover ? `/work/${job.slug}/${cover}` : null]
    }),
  )
  const loops = [...jobs, capstone]
    .map((job) => job.slug)
    .filter((slug) => LOOP.every((file) => exists('work', slug, file)))
  const folder = join(process.cwd(), 'public', 'work', capstone.slug)
  const cover = work[capstone.slug]
  const gallery = existsSync(folder)
    ? readdirSync(folder)
        // The loop's poster is a still of the loop, not a picture of its own.
        .filter((file) => IMAGES.test(file) && file !== 'poster.jpg')
        .sort()
        .map((file) => `/work/${capstone.slug}/${file}`)
        .sort((a, b) => Number(b === cover) - Number(a === cover))
    : []
  if (loops.includes(capstone.slug)) gallery.unshift(`/work/${capstone.slug}/loop.mp4`)
  const spine = exists('models', 'spine.glb') && exists('models', 'spine-lite.glb')
  return Response.json({ spine, work, gallery, loops })
}
