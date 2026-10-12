import { sections } from '@/content/site'

/** Current place in the world. Static for now; wired to the camera path in build step 4. */
export function SectionIndicator() {
  const [current] = sections
  return (
    <p className="ui text-muted">
      <span className="text-text">{current.index}</span> / {current.label}
    </p>
  )
}
