'use client'

import { type Job, jobs, workFilters } from '@/content/site'
import { useWork } from '@/stores/work'
import { useScramble } from './useScramble'

/**
 * The Work place as real HTML: the filter row and one button per job card. Tab reaches
 * each card; hovering or focusing a button focuses its 3D card (and the other way round,
 * through the work store), and its title scrambles in step with the card's.
 */
export function WorkList() {
  return (
    <nav aria-label="Work" className="flex flex-col gap-4">
      <p className="ui text-muted">
        <span className="text-text">Filter work →</span>{' '}
        {workFilters.map((filter, i) => (
          <span key={filter}>
            {i > 0 && ' · '}
            {filter}
          </span>
        ))}
      </p>
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

function WorkButton({ job, index }: { job: Job; index: number }) {
  const focused = useWork((state) => state.focused === job.slug)
  const focus = useWork((state) => state.focus)
  const metric = useScramble(job.metric, focused)
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
      aria-label={`${job.company}, ${job.metric}. ${job.role}, ${job.years}`}
      className={`text-left ui transition-colors duration-(--motion-duration-ui) ${focused ? 'text-text' : 'text-muted'}`}
    >
      <span aria-hidden>
        {String(index + 1).padStart(2, '0')} {job.company} · {metric}
      </span>
    </button>
  )
}
