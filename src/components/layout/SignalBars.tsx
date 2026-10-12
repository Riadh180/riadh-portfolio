const bars = [0, 0.2, 0.4, 0.1]

/** Tiny live "signal" glyph between nav items. Static under reduced motion. */
export function SignalBars() {
  return (
    <span aria-hidden className="flex h-2.5 items-end gap-[2px]">
      {bars.map((delay) => (
        <span
          key={delay}
          className="h-full w-[2px] origin-bottom scale-y-50 bg-glow motion-safe:animate-[signal_1.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  )
}
