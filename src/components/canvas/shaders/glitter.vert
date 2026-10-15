// Glitter round the Work spine (and in small clouds, e.g. round The Core): point sprites,
// moved on the GPU. Column grains rise up the spine in a slow helix; cloud grains circle
// their cloud. Sizes follow a power law (most tiny, a few small, rare medium; a handful of
// "sparks" near the camera). Brightness is mostly dim with a slow random twinkle: a grain
// flashes briefly when a facet catches the light. Full tier: a cheap bokeh (size and
// softness grow with distance from the focus plane); lite: none.

uniform float uTime;
uniform float uSize;
uniform float uRadius;
uniform float uRise;
uniform float uHalfHeight;
uniform float uFocusDistance;
uniform float uViewportHeight;
uniform float uBokeh;
uniform float uBrightness;
/** Pocket grains' size relative to the column dust, and how much colour grains keep. */
uniform float uCloudScale;
uniform float uSaturation;
/** silver-lilac, violet/pink, teal, warm gold. */
uniform vec3 uPalette[4];

/** angle, reach (× radius), start height, speed. */
attribute vec4 orbit;
/** Cloud centre (xyz) and spread; spread 0 = a column grain. */
attribute vec4 cloud;
/** size pick, colour pick, twinkle phase, twinkle period pick. */
attribute vec4 seed;

varying vec3 vColor;
varying float vSoft;
varying float vSpark;
varying float vPointSize;
/** 1 for a pocket grain: drawn as a soft disc, not a point. */
varying float vPocket;

void main() {
  vec3 p;
  float ends = 1.0;
  if (cloud.w > 0.0) {
    float a = orbit.x + uTime * 0.12 * orbit.w;
    vec3 offset = vec3(cos(a), sin(a * 0.7 + orbit.z) * 0.6, sin(a)) * orbit.y * cloud.w;
    p = cloud.xyz + offset;
  } else {
    float span = uHalfHeight * 2.0;
    float y = mod(orbit.z + uTime * uRise * orbit.w + uHalfHeight, span) - uHalfHeight;
    float a = orbit.x + uTime * 0.08 + y * 0.3;
    float r = uRadius * orbit.y;
    p = vec3(cos(a) * r, y, sin(a) * r);
    ends = smoothstep(uHalfHeight, uHalfHeight - 1.0, abs(y));
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.05);
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;

  // Power law: ~80% tiny, ~17% small, ~3% medium; sparks (seed.x > 0.9985) larger.
  float pick = seed.x;
  float scale = pick < 0.8 ? 0.6 + pick * 0.6 : pick < 0.97 ? 1.6 + (pick - 0.8) * 6.0 : 3.0 + (pick - 0.97) * 30.0;
  scale *= cloud.w > 0.0 ? uCloudScale : 1.0;
  vPocket = cloud.w > 0.0 && uCloudScale > 1.0 ? 1.0 : 0.0;
  // No sparks in the pockets: at the pocket scale they would be glowing cores.
  float spark = step(0.9985, pick) * (1.0 - vPocket);
  scale = mix(scale, 6.0, spark);
  float focusSize = max(uSize * scale * pixelsPerUnit, 1.0);
  float coc = uBokeh * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.006;
  float size = min(focusSize + coc, mix(18.0, 60.0, spark) * uViewportHeight / 900.0);
  gl_PointSize = size * ends;
  vPointSize = size;
  vSoft = clamp(coc / size, 0.0, 1.0);
  vSpark = spark;

  // Colour: ~60% silver-lilac, ~25% violet/pink, ~10% teal, ~5% gold; desaturated.
  float c = seed.y;
  vec3 hue = c < 0.6 ? uPalette[0] : c < 0.85 ? uPalette[1] : c < 0.95 ? uPalette[2] : uPalette[3];
  hue = mix(vec3(dot(hue, vec3(0.299, 0.587, 0.114))), hue, uSaturation);
  // Mostly dim; a slow random twinkle (period 2–6 s) peaks briefly.
  float period = 2.0 + seed.w * 4.0;
  float twinkle = pow(max(sin(uTime * 6.2831 / period + seed.z * 6.2831), 0.0), 14.0);
  float level = mix(0.7, 1.05, seed.z) + twinkle * mix(2.2, 0.8, vPocket) + spark * 2.0;
  // Pocket grains are many and overlap (additive): each one dimmer, so a pocket reads as
  // coloured beads, not a burnt-out core.
  level *= mix(1.0, 0.35, vPocket);
  // Out of focus: the light spreads over the disc (dimmer per pixel).
  float energy = clamp((focusSize * focusSize) / (size * size), 0.08, 1.0);
  vColor = hue * level * energy * uBrightness;
}
