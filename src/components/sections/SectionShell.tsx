import type { ReactNode } from 'react'
import type { SectionId } from '@/content/site'
import { sections } from '@/content/site'

type Props = {
  id: SectionId
  title: ReactNode
  children?: ReactNode
}

/** Shared section frame: mono index label, display headline, 12-column content. */
export function SectionShell({ id, title, children }: Props) {
  const section = sections.find((s) => s.id === id)
  const headingId = `${id}-title`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="page-grid min-h-svh content-start gap-y-12 border-t border-line py-[calc(var(--margin)*2.5)]"
    >
      <p className="col-span-12 meta text-muted md:col-span-2">
        <span className="text-text/40">{section?.index}</span> / {section?.label}
      </p>
      <h2
        id={headingId}
        className="col-span-12 font-display text-headline font-medium md:col-span-9 md:col-start-3"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
