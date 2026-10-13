import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Which optional 3D models are present in public/models/ (prerendered at build). The scene
 * asks this instead of probing for files, so a missing model is never a failed request.
 */
export function GET() {
  const has = (file: string) => existsSync(join(process.cwd(), 'public', 'models', file))
  return Response.json({ spine: has('spine.glb') })
}
