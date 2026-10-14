/**
 * The Core without WebGL: a rounded app-icon ring of "glass" (a slowly turning palette
 * gradient masked to a bevel-like ring, a soft top highlight) with the inner square
 * turned 45°. Used by the no-WebGL fallback and the 404 page. Decorative.
 */
export function CoreMark({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`core-mark ${className}`}>
      <span className="core-mark-ring" />
      <span className="core-mark-inner" />
    </div>
  )
}
