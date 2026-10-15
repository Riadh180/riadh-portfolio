// Builds the procedural spine off the main thread (it takes ~1s: merging, tessellating,
// welding, carving and shaping), so the page and the hero never wait for it.
import { createSpineGeometry } from './spineGeometry'

self.onmessage = ({ data }: MessageEvent<{ edge: number }>) => {
  const geometry = createSpineGeometry(data.edge)
  const attributes: Record<string, { array: Float32Array; itemSize: number }> = {}
  const transfer: ArrayBuffer[] = []
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const array = new Float32Array(attribute.array as ArrayLike<number>)
    attributes[name] = { array, itemSize: attribute.itemSize }
    transfer.push(array.buffer)
  }
  const index = geometry.index ? new Uint32Array(geometry.index.array as ArrayLike<number>) : null
  if (index) transfer.push(index.buffer)
  geometry.dispose()
  self.postMessage({ attributes, index }, { transfer })
}
