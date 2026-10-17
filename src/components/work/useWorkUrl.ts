'use client'

import { useEffect } from 'react'
import { capstone, jobs } from '@/content/site'
import { useWork } from '@/stores/work'

type Routes = {
  /** The URL of an opened card (the site: /work/<slug>). */
  toUrl: (slug: string) => string
  /** The URL with no card open. */
  base: string
  /** The opened slug in the current location, if any. */
  fromLocation: (location: Location) => string | null
  /** Called once when the page loads with a card in its URL (e.g. to scroll to it). */
  onArrive?: (slug: string) => void
}

/**
 * Keeps the address bar in step with the opened card, so every card has a shareable URL:
 * opening pushes its URL, closing returns to the base, and Back / Forward open and close
 * cards. On load, a card in the URL opens straight away.
 */
export function useWorkUrl({ toUrl, base, fromLocation, onArrive }: Routes) {
  useEffect(() => {
    const known = (slug: string | null) =>
      slug === capstone.slug || jobs.some((job) => job.slug === slug) ? slug : null
    const initial = known(fromLocation(window.location))
    if (initial) {
      useWork.getState().open(initial)
      onArrive?.(initial)
    }
    useWork.setState({ routed: true })

    let syncing = false
    const unsubscribe = useWork.subscribe((state, previous) => {
      if (syncing || state.opened === previous.opened) return
      const url = state.opened ? toUrl(state.opened) : base
      if (url !== window.location.pathname + window.location.search) {
        window.history.pushState(null, '', url)
      }
    })
    const onPop = () => {
      syncing = true
      const slug = known(fromLocation(window.location))
      if (slug) useWork.getState().open(slug)
      else useWork.getState().close()
      syncing = false
    }
    window.addEventListener('popstate', onPop)
    return () => {
      unsubscribe()
      window.removeEventListener('popstate', onPop)
    }
  }, [toUrl, base, fromLocation, onArrive])
}
