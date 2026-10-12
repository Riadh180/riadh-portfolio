import { about, profile } from '@/content/site'

export function Hero() {
  return (
    <section
      id="signal"
      aria-label="Introduction"
      className="page-grid min-h-svh content-end gap-y-10 pt-(--topbar-h) pb-[calc(var(--margin)*1.25)]"
    >
      <p className="col-span-12 meta text-muted">
        <span className="text-text/40">00</span> / Signal
      </p>

      <h1 className="col-span-12 font-display text-display font-medium uppercase">
        <span className="block">Riadh</span>
        <span className="block pl-[16.66%]">Souissi</span>
      </h1>

      <div className="col-span-12 grid grid-cols-subgrid gap-y-6 border-t border-line pt-5">
        <div className="col-span-12 flex flex-col gap-2 md:col-span-5">
          <p className="meta text-text">{profile.role}</p>
          <p className="meta text-muted">
            {about.years} yrs <span className="text-line">/</span> Web &amp; Mobile{' '}
            <span className="text-line">/</span> {profile.availability}
          </p>
        </div>
        <p className="col-span-12 font-display text-lede font-medium md:col-span-5 md:col-start-8">
          {profile.taglineLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
