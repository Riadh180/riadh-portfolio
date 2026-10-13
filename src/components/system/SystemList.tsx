'use client'

import { jobs, type Skill, skillGraph } from '@/content/site'
import { useSystem } from '@/stores/system'

/** Where a skill was used, as company names (from the CV). */
function usedAt(skill: Skill) {
  return skill.usedAt
    .map((slug) => jobs.find((job) => job.slug === slug)?.company)
    .filter(Boolean)
    .join(', ')
}

/**
 * The skills as real HTML: a nested list (branch → skills). Hovering or focusing an entry
 * lights its node in the 3D graph (and the other way round, through the system store);
 * the focused skill shows the jobs where it was used.
 */
export function SystemList() {
  const focused = useSystem((state) => state.focused)
  const focus = useSystem((state) => state.focus)
  const all = [skillGraph.core, ...skillGraph.branches.flatMap((branch) => branch.skills)]
  const current = all.find((skill) => skill.name === focused)
  const props = (id: string) => ({
    onPointerEnter: () => focus(id),
    onPointerLeave: () => {
      if (useSystem.getState().focused === id) focus(null)
    },
    onFocus: () => focus(id),
    onBlur: () => {
      if (useSystem.getState().focused === id) focus(null)
    },
  })

  return (
    <nav aria-label="Skills" className="flex flex-col gap-3">
      <button type="button" {...props('core')} className="self-start text-left ui-lg text-text">
        {skillGraph.core.name}
      </button>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
        {skillGraph.branches.map((branch) => (
          <li key={branch.id} className={branch.secondary ? 'col-span-2' : ''}>
            <button
              type="button"
              {...props(branch.id)}
              className={`text-left ui ${focused === branch.id ? 'text-text' : 'text-text/70'}`}
            >
              {branch.label}
            </button>
            <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {branch.skills.map((skill) => (
                <li key={skill.name}>
                  <button
                    type="button"
                    {...props(skill.name)}
                    className={`text-left ui transition-colors duration-(--motion-duration-ui) ${focused === skill.name ? 'text-text' : 'text-muted'}`}
                  >
                    {skill.name}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="min-h-[1.65em] ui text-violet" aria-live="polite">
        {current && (usedAt(current) ? `Used at → ${usedAt(current)}` : '')}
        {current === skillGraph.core && ' · every role'}
      </p>
    </nav>
  )
}
