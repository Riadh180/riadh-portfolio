import { profile } from '@/content/site'

/** Recruiter fast lane: identity left, email + CV always one click away. */
export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 page-grid h-(--topbar-h) items-center">
      <a href="#signal" className="col-span-6 meta text-text md:col-span-3">
        Riadh Souissi
      </a>
      <p className="col-span-4 hidden meta text-muted md:block">
        {profile.location} <span className="text-line">/</span> {profile.coordinates}
      </p>
      <nav aria-label="Contact" className="col-span-6 flex justify-end gap-6 md:col-span-5">
        <a
          href={`mailto:${profile.email}`}
          className="meta text-text transition-colors duration-(--motion-duration-ui) hover:text-glow"
        >
          <span className="hidden sm:inline">{profile.email}</span>
          <span className="sm:hidden">Email</span>
        </a>
        <a
          href={profile.cvHref}
          className="meta text-text transition-colors duration-(--motion-duration-ui) hover:text-glow"
        >
          CV
        </a>
      </nav>
    </header>
  )
}
