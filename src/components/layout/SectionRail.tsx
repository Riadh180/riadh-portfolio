import { sections } from '@/content/site'

/** Section index on the right edge. Active state is wired to scroll in build step 4. */
export function SectionRail() {
  return (
    <nav
      aria-label="Sections"
      className="fixed top-1/2 right-(--margin) z-40 hidden -translate-y-1/2 lg:block"
    >
      <ol className="flex flex-col gap-3 border-r border-line pr-4">
        {sections.map(({ id, index, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="flex justify-end gap-3 meta text-muted transition-colors duration-(--motion-duration-ui) hover:text-text"
            >
              <span>{label}</span>
              <span className="text-text/40">{index}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
