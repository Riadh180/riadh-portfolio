// Shared by the cursor scripts (cursor-flow, capture-swipe, record-swipe): going to an exact
// journey progress, and a swipe played inside the page.

/** Scrolls to a journey progress exactly (keyboard input first turns the scroll magnet off). */
export async function goToProgress(page, progress) {
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })),
  )
  await page.evaluate((p) => {
    const top = (id) => document.getElementById(id)?.offsetTop ?? 0
    const end = (id) =>
      top(id) + Math.max(0, (document.getElementById(id)?.offsetHeight ?? 0) - innerHeight)
    const anchors = [
      [0, 0],
      [top('approach'), 1],
      [end('approach'), 1],
      [top('work'), 2],
      [end('work'), 3],
      [top('system'), 4],
      [top('depth'), 5],
      [top('contact'), 6],
      [top('loop') + (document.getElementById('loop')?.offsetHeight ?? 0) - innerHeight, 7],
    ]
    let y = 0
    for (let i = 1; i < anchors.length; i++) {
      const [y0, p0] = anchors[i - 1]
      const [y1, p1] = anchors[i]
      if (p <= p1) {
        y = p1 === p0 ? y0 : y0 + ((p - p0) / (p1 - p0)) * (y1 - y0)
        break
      }
    }
    window.scrollTo(0, y)
  }, progress)
}

/**
 * A swipe from `from` to `to` (px) over `duration` ms, played inside the page on its own frame
 * clock (pointer moves, or a touch drag on phones: what the scene listens to), so its speed is
 * exact: driving it through the DevTools protocol delivers the moves in bursts. The pointer
 * (finger) rests at `from` for `rest` ms first.
 */
export function playSwipe(page, from, to, duration, touch, rest = 1500) {
  return page.evaluate(
    async (from, to, duration, touch, rest) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
      const at = (x, y, type) => {
        if (!touch) {
          window.dispatchEvent(
            new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: 'mouse' }),
          )
          return
        }
        const point = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y })
        const list = type === 'touchend' ? [] : [point]
        window.dispatchEvent(
          new TouchEvent(type, { touches: list, changedTouches: [point], bubbles: true }),
        )
      }
      at(from[0], from[1], 'touchstart')
      await new Promise((resolve) => setTimeout(resolve, rest))
      const begin = performance.now()
      for (;;) {
        await frame()
        const k = Math.min(1, (performance.now() - begin) / duration)
        at(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 'touchmove')
        if (k >= 1) break
      }
      if (touch) at(to[0], to[1], 'touchend')
    },
    from,
    to,
    duration,
    touch,
    rest,
  )
}
