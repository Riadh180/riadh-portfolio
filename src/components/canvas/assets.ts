/** What /assets.json reports as present in public/ (see src/app/assets.json/route.ts). */
export type Assets = {
  spine: boolean
  work: Record<string, string | null>
  /** The capstone's gallery: its loop (loop.mp4) when it has one, then its images, cover first. */
  gallery: string[]
  /** The slugs whose cards have a video loop (public/work/<slug>/loop.*). */
  loops: string[]
}

let request: Promise<Assets> | undefined

/** Fetched once per page load and shared. */
export function loadAssets() {
  request ??= fetch('/assets.json')
    .then((response) => response.json() as Promise<Assets>)
    .catch(() => ({ spine: false, work: {}, gallery: [], loops: [] }))
  return request
}
