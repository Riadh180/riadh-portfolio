import type { Object3D } from 'three'

/**
 * The card (or the capstone) flown in for its details, as the backdrop behind it sees it: how
 * far it has flown in (0 → 1), how far from the camera it stands, and its object (left out of
 * the backdrop's picture of the scene). One open view at a time.
 */
export const openView = {
  amount: 0,
  distance: 4,
  object: null as Object3D | null,
  owner: null as string | null,
}

/** Each frame, from every card: flown in (amount > 0), it owns the view; back home, it lets go. */
export function reportOpen(owner: string, amount: number, distance: number, object: Object3D) {
  if (amount > 0.001) {
    openView.owner = owner
    openView.amount = amount
    openView.distance = distance
    openView.object = object
  } else if (openView.owner === owner) {
    openView.owner = null
    openView.amount = 0
    openView.object = null
  }
}
