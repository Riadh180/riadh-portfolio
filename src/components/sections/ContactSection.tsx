'use client'

import { Magnetic } from '@/components/ui/Magnetic'
import { profile, sections } from '@/content/site'
import { isShown, useJourney } from '@/stores/journey'

const section = sections.find((s) => s.id === 'contact')
const link =
  'ui text-sm text-text transition-colors duration-(--motion-duration-ui) hover:text-warm focus-visible:text-warm'

/**
 * Contact, the end of the page and the site's big typographic moment: a large "Let's
 * talk", a magnetic email button, and LinkedIn / GitHub / CV, while The Core rises out of
 * the dark in warm light. For keyboard and screen readers the page ends here; only the
 * visual loop continues after it.
 */
export function ContactSection() {
  const here = useJourney((state) => isShown(state.progress, 'contact'))
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative h-[150svh]">
      <div
        data-here={here}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div className="col-span-12 flex flex-col gap-6">
          <p className="ui text-muted">
            <span className="text-text">{section?.index}</span> / {section?.label}
          </p>
          <h2
            id="contact-title"
            className="font-ui text-[clamp(3.5rem,13vw,11rem)] leading-[0.85] tracking-tight text-text uppercase"
          >
            Let’s talk
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <Magnetic>
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-3 rounded-full border border-warm/60 bg-warm/10 px-6 py-3.5 ui-lg text-text transition-colors duration-(--motion-duration-ui) hover:border-warm hover:bg-warm/20"
              >
                <span aria-hidden>→</span> {profile.email}
              </a>
            </Magnetic>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <a href={profile.linkedin} className={link} rel="me noopener" target="_blank">
                  LinkedIn ↗
                </a>
              </li>
              <li>
                <a href={profile.github} className={link} rel="me noopener" target="_blank">
                  GitHub ↗
                </a>
              </li>
              <li>
                <a href={profile.cvHref} className={link}>
                  CV ↓
                </a>
              </li>
            </ul>
          </div>
          <p className="ui text-muted">
            {profile.location} · {profile.availability}
          </p>
        </div>
      </div>
    </section>
  )
}
