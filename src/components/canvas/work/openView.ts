import type { Object3D, Vector4 } from 'three'

/**
 * The card (or the capstone) flown in for its details, as the backdrop behind it and its
 * button see it: how far it has flown in (0 → 1), how far from the camera it stands, its
 * object (left out of the backdrop's picture of the scene) and its area on the screen (NDC x0,
 * y0, x1, y1; the HTML button that closes it lies over it). One open view at a time.
 */
export const openView = {
  amount: 0,
  distance: 4,
  object: null as Object3D | null,
  owner: null as string | null,
  rect: { x: 0, y: 0, z: 0, w: 0 },
}

/**
 * A click on the opened card or the smoke behind it closes it, but not while it is still
 * flying in (`settle`, ms after it opened) and not at the end of a drag (`drag`, px moved
 * between press and release: a text selection, a swipe).
 */
export const CLOSE = { settle: 600, drag: 6 }

/** Each frame, from every card: flown in (amount > 0), it owns the view; back home, it lets go. */
export function reportOpen(
  owner: string,
  amount: number,
  distance: number,
  object: Object3D,
  rect: Vector4,
) {
  if (amount > 0.001) {
    openView.owner = owner
    openView.amount = amount
    openView.distance = distance
    openView.object = object
    Object.assign(openView.rect, { x: rect.x, y: rect.y, z: rect.z, w: rect.w })
  } else if (openView.owner === owner) {
    openView.owner = null
    openView.amount = 0
    openView.object = null
  }
}
