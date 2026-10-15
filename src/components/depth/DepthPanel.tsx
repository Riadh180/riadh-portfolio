import { capstone, depth } from '@/content/site'

/**
 * Depth's content as real HTML, kept short on screen: the heading, one sentence, the
 * capstone with its repository; the programme and both stacks sit in a small expandable
 * "Stack" line (still in the HTML). Data vocabulary lives here only.
 */
export function DepthPanel() {
  return (
    <div className="flex max-w-[44ch] flex-col gap-3">
      <h2 className="ui text-xs text-muted">{depth.title}</h2>
      <p className="copy text-sm leading-relaxed text-text/90">{depth.lead}</p>
      <p className="ui text-xs text-text">
        Capstone · {capstone.company}
        {capstone.repo && (
          <>
            {' · '}
            <a
              href={capstone.repo}
              target="_blank"
              rel="noopener"
              className="text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
            >
              GitHub ↗
            </a>
          </>
        )}
      </p>
      <details className="group ui text-xs text-text/70">
        <summary className="cursor-pointer list-none text-muted transition-colors duration-(--motion-duration-ui) hover:text-text">
          <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>{' '}
          Stack
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>
            {depth.programme}
            <span className="block">{depth.details}</span>
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-emerald" aria-label="Data stack">
            {depth.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="copy normal-case">{capstone.summary}</p>
          <p>{capstone.stack.join(' · ')}</p>
        </div>
      </details>
    </div>
  )
}
