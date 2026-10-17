import type { Box3, Camera, Object3D } from 'three'
import { Vector3 } from 'three'

declare global {
  interface Window {
    /**
     * Measurement only (scripts/contact-overlap.mjs sets it): named objects' boxes on the
     * screen, [left, top, right, bottom] in px.
     */
    __boxes?: Record<string, number[]>
    /** Measurement only (scripts/phone-pass.mjs sets it): the touch stir's strength. */
    __air?: { push?: number }
  }
}

const corner = new Vector3()

/**
 * Measurement only: once a script has set `window.__boxes`, writes `box` (the object's
 * local bounds) projected to the screen. Costs one property check otherwise.
 */
export function exportScreenBox(
  name: string,
  object: Object3D,
  box: Box3,
  camera: Camera,
  width: number,
  height: number,
) {
  const boxes = window.__boxes
  if (!boxes) return
  if (!object.visible) {
    delete boxes[name]
    return
  }
  object.updateWorldMatrix(true, false)
  camera.updateMatrixWorld()
  const out = [Infinity, Infinity, -Infinity, -Infinity]
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    )
    object.localToWorld(corner).project(camera)
    const x = ((corner.x + 1) / 2) * width
    const y = ((1 - corner.y) / 2) * height
    out[0] = Math.min(out[0]!, x)
    out[1] = Math.min(out[1]!, y)
    out[2] = Math.max(out[2]!, x)
    out[3] = Math.max(out[3]!, y)
  }
  boxes[name] = out
}
