/**
 * Where the job cards hang round the spine (Work space), shared by the cards and the
 * camera path, which stops at each card.
 */

/** Desktop: cards spaced down the spine; the camera turns this far round it top to bottom. */
export const ORBIT_FIRST = 1.6
export const ORBIT_SPACING = 2.1
export const SPIRAL = 0.5

/** Phones: one card above the other in front of the spine. */
export const COLUMN_SPACING = 1.9

/**
 * Each card's own pose, so six don't repeat: angle offset from the camera's line of sight
 * at its stop (positive = to the right), distance from the axis, a nudge in height, and a
 * little pitch and roll, and how far it leans towards the viewer at rest (`face`, 0..1):
 * some stay turned along the spiral, so their thick lit side walls show (at_05). Nothing
 * goes low on the left (the list and details live there): the left cards hang high, above
 * it, overlapping the right ones behind the column, as in the reference (seg_44).
 */
const POSES = [
  { angle: 0.0, radius: 3.0, dy: 0.0, pitch: 0.04, roll: -0.03, face: 0.7 },
  { angle: -0.34, radius: 2.85, dy: 0.55, pitch: -0.08, roll: 0.07, face: 0.15 },
  { angle: -0.1, radius: 3.35, dy: -0.15, pitch: 0.08, roll: -0.08, face: 0.6 },
  { angle: -0.4, radius: 2.95, dy: 0.6, pitch: -0.05, roll: 0.1, face: 0.1 },
  { angle: 0.06, radius: 3.15, dy: -0.25, pitch: 0.09, roll: -0.05, face: 0.55 },
  { angle: -0.3, radius: 2.8, dy: 0.5, pitch: -0.07, roll: 0.06, face: 0.2 },
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
    /** Hangs left of the column (high, above the HTML list). */
    left: pose.angle < 0,
  }
}
