import { capstone, depth } from '@/content/site'

/** Depth's content as real HTML: short lines in mono, then the capstone (data vocabulary lives here only). */
export function DepthPanel() {
  return (
    <div className="flex max-w-[46ch] flex-col gap-3">
      <h2 className="ui-lg text-base text-text sm:text-lg">{depth.title}</h2>
      <p className="copy text-sm leading-relaxed text-text/90">{depth.lead}</p>
      <p className="ui text-xs text-text/70">
        {depth.programme}
        <span className="block">{depth.details}</span>
      </p>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 ui text-xs text-emerald max-sm:sr-only"
        aria-label="Data stack"
      >
        {depth.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex flex-col gap-1">
        <p className="ui text-xs text-text">Capstone · {capstone.company}</p>
        <p className="copy text-xs leading-relaxed text-text/80">{capstone.summary}</p>
        {/* Phones: the stacks stay for screen readers only, so the panel above stays clear. */}
        <p className="ui text-xs text-text/60 max-sm:sr-only">{capstone.stack.join(' · ')}</p>
        {capstone.repo && (
          <a
            href={capstone.repo}
            target="_blank"
            rel="noopener"
            className="self-start ui text-xs text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            Repository on GitHub ↗
          </a>
        )}
      </div>
    </div>
  )
}
