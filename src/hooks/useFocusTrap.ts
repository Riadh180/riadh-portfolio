import { type RefObject, useEffect } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside `container` while `active`, as in a modal dialog: Tab and
 * Shift+Tab wrap round its focusable elements, and a Tab from outside (before focus has
 * moved in) lands on its first or last one.
 */
export function useFocusTrap(container: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      const root = container.current
      if (event.key !== 'Tab' || !root) return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      )
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!first || !last) {
        event.preventDefault()
        root.focus()
        return
      }
      if (!(current instanceof Node) || !root.contains(current)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && (current === first || current === root)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [container, active])
}
