'use client'

import { type Job, jobs, type WorkFilter, workFilters } from '@/content/site'
import { Scramble } from '@/components/ui/Scramble'
import { useWork } from '@/stores/work'
import { useScramble } from '@/hooks/useScramble'

/**
 * The Work place as real HTML: the filter row and one button per job card. Tab reaches
 * each card; hovering or focusing a button focuses its 3D card (and the other way round,
 * through the work store), and its title scrambles in step with the card's.
 */
export function WorkList() {
  return (
    <nav aria-label="Work" className="flex flex-col gap-4">
      <div role="group" aria-label="Filter work" className="ui text-muted">
        <span className="text-text">Filter work →</span>{' '}
        {workFilters.map((filter, i) => (
          <span key={filter}>
            {i > 0 && <span aria-hidden> · </span>}
            <FilterButton filter={filter} />
          </span>
        ))}
      </div>
      <ol className="flex flex-col gap-1">
        {jobs.map((job, i) => (
          <li key={job.slug}>
            <WorkButton job={job} index={i} />
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** One filter: toggles; jobs outside it dim in the list and in the scene. */
function FilterButton({ filter }: { filter: WorkFilter }) {
  const active = useWork((state) => state.filter === filter)
  const setFilter = useWork((state) => state.setFilter)
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setFilter(active ? null : filter)}
      className={`ui transition-colors duration-(--motion-duration-ui) hover:text-text ${active ? 'text-violet' : ''}`}
    >
      <Scramble text={filter} />
    </button>
  )
}

function WorkButton({ job, index }: { job: Job; index: number }) {
  const focused = useWork((state) => state.focused === job.slug)
  const focus = useWork((state) => state.focus)
  const open = useWork((state) => state.open)
  const metric = useScramble(job.metric, focused)
  const outside = useWork((state) => state.filter !== null && !job.filters.includes(state.filter))
  const leave = () => {
    if (useWork.getState().focused === job.slug) focus(null)
  }

  return (
    <button
      type="button"
      onPointerEnter={() => focus(job.slug)}
      onPointerLeave={leave}
      onFocus={() => focus(job.slug)}
      onBlur={leave}
      onClick={() => open(job.slug)}
      data-work={job.slug}
      aria-label={`${job.company}, ${job.metric}. ${job.role}, ${job.years}`}
      className={`text-left ui transition-[color,opacity] duration-(--motion-duration-ui) hover:text-text ${focused ? 'text-text' : 'text-muted'} ${outside ? 'opacity-40' : ''}`}
    >
      <span aria-hidden>
        {String(index + 1).padStart(2, '0')} {job.company} · {metric}
      </span>
    </button>
  )
}
