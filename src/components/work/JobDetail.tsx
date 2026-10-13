import type { Job } from '@/content/site'
import { jobs } from '@/content/site'

type Props = {
  job: Job
  /** The heading's id, for aria-labelledby. */
  headingId: string
  /** The heading level: h1 on its own page, h2 inside the Work place. */
  as?: 'h1' | 'h2'
}

/**
 * A job's details in mono type, sized and lit for reading (this is what recruiters read): the real content of an opened card. Shared by the
 * detail panel over the scene and the /work/<slug> page, so both stay identical.
 */
export function JobDetail({ job, headingId, as: Heading = 'h2' }: Props) {
  const index = jobs.indexOf(job)
  return (
    <>
      <p className="ui text-xs text-text/70">
        <span className="text-text">{String(index + 1).padStart(2, '0')}</span> / {jobs.length} ·{' '}
        {job.years}
      </p>
      <Heading id={headingId} className="ui-lg text-base text-text sm:text-lg">
        {job.company} · {job.metric}
        <span className="mt-1 block text-sm text-text/70">{job.role}</span>
      </Heading>
      <p className="copy max-w-[44ch] text-sm leading-relaxed text-text/90">{job.summary}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 ui text-xs text-text/70" aria-label="Stack">
        {job.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  )
}
