// Wakes the high-performance GPU off the main thread. On dual-GPU laptops creating the
// first context on the discrete GPU blocks for ~0.6s; done here first, the page's own
// context then takes a few milliseconds. The context is kept until the page says so.
let context: WebGL2RenderingContext | null = null

self.onmessage = ({ data }: MessageEvent<'warm' | 'release'>) => {
  if (data === 'release') {
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    context = null
    return
  }
  try {
    context = new OffscreenCanvas(4, 4).getContext('webgl2', {
      powerPreference: 'high-performance',
    })
  } catch {
    context = null
  }
  self.postMessage('ready')
}
