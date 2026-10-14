import { Magnetic } from '@/components/ui/Magnetic'
import { Scramble } from '@/components/ui/Scramble'
import { profile } from '@/content/site'
import { SectionIndicator } from './SectionIndicator'
import { SignalBars } from './SignalBars'

const link = 'transition-colors duration-(--motion-duration-ui) hover:text-glow'

/**
 * Name left (phones: it lives in the hero block instead); nav + recruiter fast lane
 * (contact = email, CV) right, always one click away.
 */
export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 page-grid items-start pt-(--margin)">
      <a href="#signal" className={`col-span-6 ui-lg text-text max-sm:invisible ${link}`}>
        <Scramble text={profile.name} />
      </a>
      <div className="col-span-6 flex flex-col items-end gap-3">
        <Magnetic strength={0.12}>
          <nav
            aria-label="Primary"
            className="flex items-center gap-4 rounded-full border border-line bg-bg/80 px-5 py-2.5 ui text-text"
          >
            <a href="#work" className={link}>
              <Scramble text="Work" />
            </a>
            <SignalBars />
            <a href="#contact" className={link}>
              <Scramble text="Contact" />
            </a>
            <span aria-hidden className="h-3 w-px bg-line" />
            <a href={profile.cvHref} className={link}>
              <Scramble text="CV" />
            </a>
          </nav>
        </Magnetic>
        {/* The email, always one click away. */}
        <a href={`mailto:${profile.email}`} className={`ui text-violet max-sm:hidden ${link}`}>
          <Scramble text={profile.email} />
        </a>
        <SectionIndicator />
      </div>
    </header>
  )
}
