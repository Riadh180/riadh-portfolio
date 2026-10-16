/**
 * Where the job cards hang round the spine (Work space), shared by the cards and the
 * camera path, which stops at each card.
 */

/**
 * Desktop: cards spaced down the spine, close enough that the neighbours above and below show
 * at the frame's edges at every stop (a gallery, not one slide at a time).
 */
export const ORBIT_FIRST = 1.6
export const ORBIT_SPACING = 1.45
/** The camera orbits the column: 3/4 of a turn from the first card to the last (one card every 54°). */
export const SPIRAL = (Math.PI * 2 * 3) / 4

/**
 * At its stop a card comes forward, a share of the way towards the camera (instead of the
 * camera dollying in), so it is always in front of its neighbours and never covered by
 * them; `width`: how far (in cards) from its stop it starts coming forward.
 */
export const APPROACH = { share: 0.12, width: 0.5 }

/** Phones: one card above the other in front of the spine. */
export const COLUMN_SPACING = 2.4

/**
 * Each card's own pose, so six don't repeat: angle offset from the camera's line of sight
 * at its stop (positive = to the right), distance from the axis, a nudge in height, and a
 * little pitch and roll, and how far it leans towards the viewer at rest (`face`, 0..1):
 * some stay turned along the spiral, so their thick lit side walls show (at_05). All hang on
 * the same side of the camera's line, a regular helix: the previous card up to the left, the
 * next one down to the right and further round, the one after behind the column, so no two
 * neighbours share a place round the column (alternating sides stacked them into each
 * other once the spacing closed up), and nothing hangs low on the left over the HTML list.
 */
const POSES = [
  { angle: 0.5, radius: 2.6, dy: 0.0, pitch: 0.04, roll: -0.03, face: 0.55 },
  { angle: 0.5, radius: 2.6, dy: 0.1, pitch: -0.08, roll: 0.07, face: 0.5 },
  { angle: 0.5, radius: 2.6, dy: -0.1, pitch: 0.08, roll: -0.08, face: 0.55 },
  { angle: 0.5, radius: 2.6, dy: 0.12, pitch: -0.05, roll: 0.1, face: 0.5 },
  { angle: 0.5, radius: 2.6, dy: -0.12, pitch: 0.09, roll: -0.05, face: 0.55 },
  { angle: 0.5, radius: 2.6, dy: 0.08, pitch: -0.07, roll: 0.06, face: 0.5 },
]

export function orbitPose(index: number, count: number) {
  const pose = POSES[index % POSES.length] ?? POSES[0]!
  const camera = (index / Math.max(1, count - 1)) * SPIRAL
  return {
    angle: camera + pose.angle,
    radius: pose.radius,
    y: ORBIT_FIRST - index * ORBIT_SPACING + pose.dy,
    pitch: pose.pitch,
    roll: pose.roll,
    face: pose.face,
  }
}
