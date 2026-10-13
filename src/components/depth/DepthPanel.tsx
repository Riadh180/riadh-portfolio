import { depth } from '@/content/site'

/** Depth's content as real HTML: four short lines in mono (data vocabulary lives here only). */
export function DepthPanel() {
  return (
    <div className="flex max-w-[46ch] flex-col gap-3">
      <h2 className="ui-lg text-base text-text sm:text-lg">{depth.title}</h2>
      <p className="copy text-sm leading-relaxed text-text/90">{depth.lead}</p>
      <p className="ui text-xs text-text/70">{depth.programme}</p>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 ui text-xs text-emerald"
        aria-label="Data stack"
      >
        {depth.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="ui text-xs text-text/70">{depth.capstone}</p>
    </div>
  )
}
