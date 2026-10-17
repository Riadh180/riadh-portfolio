import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { capstone, jobs } from '@/content/site'

const COVERS = ['cover.webp', 'cover.jpg', 'cover.png']
const IMAGES = /\.(webp|jpe?g|png|svg)$/i

/**
 * Which optional media is present in public/ (prerendered at build): the sculpted spine
 * (public/models/spine.glb), each job's and the capstone's cover
 * (public/work/<slug>/cover.webp|jpg|png) and the capstone's gallery (every image in its
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
  const folder = join(process.cwd(), 'public', 'work', capstone.slug)
  const cover = work[capstone.slug]
  const gallery = existsSync(folder)
    ? readdirSync(folder)
        .filter((file) => IMAGES.test(file))
        .sort()
        .map((file) => `/work/${capstone.slug}/${file}`)
        .sort((a, b) => Number(b === cover) - Number(a === cover))
    : []
  return Response.json({ spine: exists('models', 'spine.glb'), work, gallery })
}
