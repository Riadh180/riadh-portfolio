'use client'

import { GlitchText } from '@/components/ui/GlitchText'
import { EmailButton } from '@/components/ui/EmailButton'
import { Scramble } from '@/components/ui/Scramble'
import { profile, sections } from '@/content/site'
import { isShown, useJourney } from '@/stores/journey'

const section = sections.find((s) => s.id === 'contact')
const legal =
  'transition-colors duration-(--motion-duration-ui) hover:text-text focus-visible:text-text'
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
            <GlitchText text="Let’s talk" active={here} />
          </h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <EmailButton email={profile.email} />
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li>
                <a href={profile.linkedin} className={link} rel="me noopener" target="_blank">
                  <Scramble text="LinkedIn" /> <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={profile.github} className={link} rel="me noopener" target="_blank">
                  <Scramble text="GitHub" /> <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={profile.cvHref} className={link}>
                  <Scramble text="CV" /> <span aria-hidden>↓</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="ui text-muted">
              {profile.location} · {profile.availability}
            </p>
            <p className="ui text-muted">
              <a href="/impressum" className={legal}>
                Impressum
              </a>
              {' · '}
              <a href="/datenschutz" className={legal}>
                Datenschutz
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
