import { DataTexture, LinearFilter, RepeatWrapping, RGBAFormat } from 'three'

/**
 * Thin-film thickness that varies over the glass. Three only reads a thickness range
 * through a map (without one, the film is a single thickness and tints the whole surface
 * one colour). Slow waves along each tube spread pink / green / blue bands that slide
 * along the glass as it turns. Read from the green channel, against the material's
 * iridescenceThicknessRange.
 */
export function createFilmTexture(width = 256, height = 32) {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x / width) * Math.PI * 2
      const v = (y / height) * Math.PI * 2
      const wave = Math.sin(u * 3 + Math.sin(v) * 0.8) * 0.6 + Math.sin(u * 7 + v * 2 + 1.3) * 0.4
      const value = Math.round((0.5 + 0.5 * wave) * 255)
      data.set([value, value, value, 255], (y * width + x) * 4)
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}
