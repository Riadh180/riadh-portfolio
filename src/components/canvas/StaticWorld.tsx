import { CoreMark } from '@/components/ui/CoreMark'

/**
 * The world without WebGL (unsupported, disabled or failed): the same dark charcoal with
 * the corner light bleeds, and The Core as a glass-like mark where the hero has it. All
 * content stays in the HTML above it.
 */
export function StaticWorld() {
  return (
    <div aria-hidden className="static-world pointer-events-none fixed inset-0">
      <CoreMark className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  )
}
