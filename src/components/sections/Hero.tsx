import { profile } from '@/content/site'
import { HeroFade } from './HeroFade'

/** The 10-second read for recruiters: who, what, where, how to reach me. */
export function Hero() {
  return (
    <section id="signal" aria-labelledby="signal-title" className="min-h-svh">
      <HeroFade>
        <div className="pointer-events-auto col-span-12 flex flex-col gap-4 sm:col-span-7 lg:col-span-4">
          <h1 id="signal-title" className="ui-lg text-text">
            {profile.name}
            <span className="block text-muted">{profile.role}</span>
          </h1>
          <p className="ui-lg text-text">{profile.tagline}</p>
          <p className="ui text-muted">
            {profile.location} · {profile.availability}
          </p>
          <a
            href={`mailto:${profile.email}`}
            className="self-start ui text-violet transition-colors duration-(--motion-duration-ui) hover:text-text"
          >
            → {profile.email}
          </a>
        </div>
      </HeroFade>
    </section>
  )
}
