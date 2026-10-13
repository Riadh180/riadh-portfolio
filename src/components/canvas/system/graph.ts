import { Vector3 } from 'three'
import { skillGraph } from '@/content/site'

export type GraphNode = {
  /** Skill name, branch id, or 'core'. */
  id: string
  label: string
  kind: 'core' | 'branch' | 'leaf'
  branch: string | null
  secondary: boolean
  position: Vector3
  /** Parent node index (the core has none). */
  parent: number
}

/**
 * Lays the skills graph out in 3D: React / TypeScript at the centre; the main branches on
 * the upper arc round it, each with its skills fanned out beyond it; the data branch
 * hanging straight down, its skills in a quiet row below (visually secondary).
 */
export function layoutGraph() {
  const nodes: GraphNode[] = [
    {
      id: 'core',
      label: skillGraph.core.name,
      kind: 'core',
      branch: null,
      secondary: false,
      position: new Vector3(),
      parent: -1,
    },
  ]
  const main = skillGraph.branches.filter((branch) => !branch.secondary)
  skillGraph.branches.forEach((branch) => {
    const k = main.indexOf(branch)
    // Main branches round the upper arc (from lower right, over the top, to lower left),
    // leaving the bottom to the data branch, which hangs straight down.
    const angle = ((-25 + (k / Math.max(1, main.length - 1)) * 230) * Math.PI) / 180
    const direction = branch.secondary
      ? new Vector3(0, -1, 0)
      : new Vector3(Math.cos(angle), Math.sin(angle) * 0.8, Math.sin(k * 1.9) * 0.25).normalize()
    const reach = branch.secondary ? 2.4 : 2.4
    const branchIndex = nodes.length
    nodes.push({
      id: branch.id,
      label: branch.label,
      kind: 'branch',
      branch: branch.id,
      secondary: !!branch.secondary,
      position: direction.clone().multiplyScalar(reach),
      parent: 0,
    })
    const count = branch.skills.length
    branch.skills.forEach((skill, i) => {
      const spread = (i - (count - 1) / 2) / Math.max(1, count - 1)
      let position: Vector3
      if (branch.secondary) {
        // A quiet row below the data branch.
        position = new Vector3(spread * 6, -reach - 0.9 - (i % 2) * 0.35, Math.sin(i * 1.7) * 0.2)
      } else {
        // Fanned on an arc beyond the branch, wide enough that labels don't collide.
        // Near the top the labels sit side by side: fan wider and stagger the distance.
        const upright = Math.abs(Math.sin(angle))
        const fanAngle = angle + spread * (0.42 + count * 0.07) * (1 + upright * 0.3)
        const out = reach + 1.45 + (i % 2) * upright * 0.75
        position = new Vector3(
          Math.cos(fanAngle) * out,
          Math.sin(fanAngle) * out * 0.82,
          direction.z * out + Math.sin(i * 2.1) * 0.2,
        )
      }
      nodes.push({
        id: skill.name,
        label: skill.name,
        kind: 'leaf',
        branch: branch.id,
        secondary: !!branch.secondary,
        position,
        parent: branchIndex,
      })
    })
  })
  return nodes
}

/** Whether node `i` is lit while `focused` is in focus: itself, its line to the core, its skills. */
export function isRelated(nodes: GraphNode[], i: number, focused: string | null) {
  if (!focused) return false
  const node = nodes[i]
  if (!node) return false
  if (node.id === focused) return true
  const target = nodes.find((n) => n.id === focused)
  if (!target) return false
  // On the path from the focused node to the core.
  let walk: GraphNode | undefined = target
  while (walk && walk.parent >= 0) {
    if (nodes[walk.parent] === node) return true
    walk = nodes[walk.parent]
  }
  // A skill of a focused branch, or every branch when the core is focused.
  if (target.kind === 'branch' && node.branch === target.branch) return true
  if (target.kind === 'core' && node.kind === 'branch') return true
  return false
}
