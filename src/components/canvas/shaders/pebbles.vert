// Pebbles round the Work spine, moved entirely on the GPU. Column pebbles rise up the spine
// in a slow helix and wrap round; cloud pebbles drift slowly round their small cloud.
// Sized with the same depth of field as the dust, so near and far ones melt into bokeh.

uniform float uTime;
uniform float uSize;
uniform float uBrightness;
uniform float uRadius;
uniform float uRise;
uniform float uHalfHeight;
uniform float uAperture;
uniform float uFocusDistance;
uniform float uViewportHeight;
// magenta-pink, violet, teal, emerald
uniform vec3 uPalette[4];

/** angle, reach (× radius), start height, speed. */
attribute vec4 orbit;
/** Cloud centre (xyz) and spread; spread 0 = a column pebble. */
attribute vec4 cloud;
/** size, colour pick, twinkle phase, brightness. */
attribute vec4 seed;

varying vec3 vColor;
varying float vBlur;
varying float vPointSize;
varying float vShape;
varying float vGlint;

vec3 pebbleColor(float pick) {
  if (pick < 0.38) return uPalette[0];
  if (pick < 0.66) return uPalette[1];
  if (pick < 0.86) return uPalette[2];
  return uPalette[3];
}

void main() {
  vec3 p;
  float ends = 1.0;
  if (cloud.w > 0.0) {
    // Orbit the cloud's centre slowly on a tilted ring.
    float a = orbit.x + uTime * 0.15 * orbit.w;
    vec3 offset = vec3(cos(a), sin(a * 0.7 + orbit.z) * 0.6, sin(a)) * orbit.y * cloud.w;
    p = cloud.xyz + offset;
  } else {
    float span = uHalfHeight * 2.0;
    float y = mod(orbit.z + uTime * uRise * orbit.w + uHalfHeight, span) - uHalfHeight;
    float a = orbit.x + uTime * 0.1 + y * 0.3;
    float r = uRadius * orbit.y;
    p = vec3(cos(a) * r, y, sin(a) * r);
    ends = smoothstep(uHalfHeight, uHalfHeight - 1.0, abs(y));
  }

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depth = max(-mvPosition.z, 0.05);
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  // Mostly small chips; a rare few large ones.
  float focusSize = max(uSize * mix(0.3, 3.2, pow(seed.x, 6.0)) * pixelsPerUnit, 1.5);
  float coc = uAperture * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.012;
  float size = min(focusSize + coc, 90.0);
  vPointSize = size;
  vBlur = clamp(coc / size, 0.0, 1.0);
  float energy = clamp((focusSize * focusSize) / (size * size), 0.08, 1.0);
  gl_PointSize = size * ends;

  // Vivid tinted glass (the world around is muted; the materials carry the colour).
  vec3 hue = pebbleColor(seed.y);
  vec3 color = mix(vec3(dot(hue, vec3(0.299, 0.587, 0.114))), hue, 0.92) * mix(0.4, 0.95, seed.w);
  vColor = color * uBrightness * energy;
  vShape = seed.z;
  // Facets flash as the chip tumbles past the light.
  vGlint = pow(max(0.0, sin(uTime * (0.6 + seed.z * 1.4) + seed.w * 31.0)), 24.0) * 1.6 * uBrightness;
}
