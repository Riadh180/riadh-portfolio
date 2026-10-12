import type { ReactNode } from 'react'
import type { SectionId } from '@/content/site'
import { sections } from '@/content/site'

type Props = {
  id: SectionId
  title: ReactNode
  children?: ReactNode
}

/** A place in the world: small mono label, title and copy, anchored bottom-left. */
export function SectionShell({ id, title, children }: Props) {
  const section = sections.find((s) => s.id === id)
  const headingId = `${id}-title`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="page-grid min-h-svh content-end pb-(--margin)"
    >
      <div className="col-span-12 flex flex-col gap-3 sm:col-span-7 lg:col-span-4">
        <p className="ui text-muted">
          <span className="text-text">{section?.index}</span> / {section?.label}
        </p>
        <h2 id={headingId} className="ui-lg text-text">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}
