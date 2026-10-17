import { setConsoleFunction } from 'three'

/**
 * React Three Fiber 9 (the current stable line) still builds a THREE.Clock in its store, and
 * three deprecated Clock in r183: a warning about a dependency's internals that the site can't
 * act on, printed on every visit. three's own console hook passes every other message through
 * unchanged. Remove this once Fiber builds a THREE.Timer (Fiber 10).
 */
const FIBER_CLOCK = 'THREE.Clock: This module has been deprecated'

setConsoleFunction((type: 'log' | 'warn' | 'error', message: unknown, ...params: unknown[]) => {
  if (type === 'warn' && typeof message === 'string' && message.startsWith(FIBER_CLOCK)) return
  console[type](message, ...params)
})
