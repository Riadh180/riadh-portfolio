'use client'

import { profile, sections } from '@/content/site'
import { isShown, useJourney } from '@/stores/journey'

const section = sections.find((s) => s.id === 'contact')
const link =
  'self-start ui text-violet transition-colors duration-(--motion-duration-ui) hover:text-text'

/**
 * Contact, the end of the page: "Let's talk", the email, LinkedIn, GitHub and the CV, while
 * The Core rises out of the dark in warm light. For keyboard and screen readers the page
 * ends here; only the visual loop continues after it.
 */
export function ContactSection() {
  const here = useJourney((state) => isShown(state.progress, 'contact'))
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative h-[150svh]">
      <div
        data-here={here}
        className="sticky top-0 page-grid h-svh content-end pb-(--margin) opacity-0 transition-opacity duration-700 ease-signal data-[here=true]:opacity-100"
      >
        <div className="col-span-12 flex flex-col gap-4 sm:col-span-7 lg:col-span-4">
          <p className="ui text-muted">
            <span className="text-text">{section?.index}</span> / {section?.label}
          </p>
          <h2 id="contact-title" className="ui-lg text-base text-text sm:text-lg">
            Let’s talk
          </h2>
          <a href={`mailto:${profile.email}`} className={`${link} text-sm`}>
            → {profile.email}
          </a>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
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
          <p className="ui text-muted">
            {profile.location} · {profile.availability}
          </p>
        </div>
      </div>
    </section>
  )
}
