'use client'

import { capstone, depth } from '@/content/site'
import { useWork } from '@/stores/work'

/**
 * Depth's content as real HTML, kept short on screen: the heading, one sentence, the
 * capstone (a button: it opens the capstone's panel, as the 3D panel does) with its
 * repository; the programme and both stacks sit in a small expandable "Stack" line (still in
 * the HTML). Data vocabulary lives here only.
 */
export function DepthPanel() {
  const open = useWork((state) => state.open)
  return (
    <div className="flex max-w-[44ch] flex-col gap-3">
      <h2 className="ui text-xs text-muted">{depth.title}</h2>
      <p className="copy text-sm leading-relaxed text-text/90">{depth.lead}</p>
      <p className="ui text-xs text-text">
        <button
          type="button"
          data-work={capstone.slug}
          onClick={() => open(capstone.slug)}
          className="ui text-xs text-text underline-offset-4 transition-colors duration-(--motion-duration-ui) hover:text-violet hover:underline"
        >
          Capstone · {capstone.company}
        </button>
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
