/** What /assets.json reports as present in public/ (see src/app/assets.json/route.ts). */
export type Assets = {
  spine: boolean
  work: Record<string, string | null>
  /** The capstone's images, its cover first. */
  gallery: string[]
}

let request: Promise<Assets> | undefined

/** Fetched once per page load and shared. */
export function loadAssets() {
  request ??= fetch('/assets.json')
    .then((response) => response.json() as Promise<Assets>)
    .catch(() => ({ spine: false, work: {}, gallery: [] }))
  return request
}
