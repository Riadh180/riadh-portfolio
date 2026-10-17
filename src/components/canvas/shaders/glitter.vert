// Glitter round the Work spine (and in small clouds, e.g. round The Core): glass beads as
// point sprites, moved on the GPU. Column beads rise up the spine in a slow helix; cloud
// beads circle their cloud, whose outline is irregular (lobed, with wisps), dense at its
// core. Sizes follow a power law (~75% tiny points, ~20% small, ~5% medium and large beads;
// a handful of sparks near the camera). Brightness in tiers (~70% dim, ~25% medium, ~5%
// bright, grainMotion.glsl) with a slow twinkle; only the bright beads glint. The cursor
// parts the clouds. Full tier: a wide depth of field (out-of-focus beads large and soft).
// With POCKET_HUES (Work's pockets) every pocket bead carries its own colour (`tint`).

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

#ifdef FILAMENTS
/** System: the graph's filaments (place space): endpoints, w = how active each one is. */
uniform vec4 uFilamentA[FILAMENTS];
uniform vec4 uFilamentB[FILAMENTS];
#endif

/** angle, reach (× radius), start height, speed. */
attribute vec4 orbit;
/** Cloud centre (xyz) and spread; spread 0 = a column grain. */
attribute vec4 cloud;
/** size pick, colour pick, twinkle phase, twinkle period pick. */
attribute vec4 seed;
#ifdef POCKET_HUES
/** A pocket bead's own colour (each pocket mixes several hues, see Pebbles.tsx). */
attribute vec3 tint;
#endif

varying vec3 vColor;
varying float vSoft;
varying float vSpark;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  vec3 p;
  float ends = 1.0;
  if (cloud.w > 0.0) {
    float a = orbit.x + uTime * 0.12 * orbit.w;
    // An irregular cloud: lobes round its outline and a slow wobble, so no pocket is a round
    // blob; grains far out (the strays) trail into wisps along the lobes.
    float lobes = 1.0 + 0.38 * sin(a * 3.0 + cloud.x * 1.7) + 0.22 * sin(a * 5.0 + cloud.y * 2.3 + uTime * 0.05);
    float reach = orbit.y * mix(1.0, lobes, smoothstep(0.35, 1.0, orbit.y));
    vec3 offset = vec3(cos(a), sin(a * 0.7 + orbit.z) * 0.6, sin(a)) * reach * cloud.w;
    offset.y += (orbit.y - 0.5) * sin(a * 2.0 + cloud.z) * 0.35 * cloud.w;
    p = cloud.xyz + offset;
  } else {
    float span = uHalfHeight * 2.0;
    float y = mod(orbit.z + uTime * uRise * orbit.w + uHalfHeight, span) - uHalfHeight;
    float a = orbit.x + uTime * 0.08 + y * 0.3;
    float r = uRadius * orbit.y;
    p = vec3(cos(a) * r, y, sin(a) * r);
    ends = smoothstep(uHalfHeight, uHalfHeight - 1.0, abs(y));
  }

  vec4 world = modelMatrix * vec4(p, 1.0);
  vec3 view = (viewMatrix * world).xyz;
  float stirred;
  view = grainCursor(view, uFocusDistance, stirred);
  gl_Position = projectionMatrix * vec4(view, 1.0);
  float depth = max(-view.z, 0.05);
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;

  // Power law: ~75% tiny points, ~20% small chips, ~5% medium and large; sparks (seed.x >
  // 0.9985).
  float pick = seed.x;
  float scale = pick < 0.75 ? 0.65 + pick * 0.6 : pick < 0.95 ? 1.6 + (pick - 0.75) * 3.0 : 2.6 + (pick - 0.95) * 32.0;
  float pocket = cloud.w > 0.0 && uCloudScale > 1.0 ? 1.0 : 0.0;
  scale *= cloud.w > 0.0 ? uCloudScale : 1.0;
  // No sparks in the pockets.
  float spark = step(0.9985, pick) * (1.0 - pocket);
  scale = mix(scale, 6.0, spark);
  float focusSize = max(uSize * scale * pixelsPerUnit, 1.0);
  // A wide depth of field: out-of-focus beads grow large and soft, in-focus ones stay crisp.
  float coc = uBokeh * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.0095;
  float size = min(focusSize + coc, mix(26.0, 60.0, spark) * uViewportHeight / 900.0);
  gl_PointSize = size * ends;
  vPointSize = size;
  vSoft = clamp(coc / size, 0.0, 1.0);
  vSpark = spark;
  vPhase = seed.z;

  // Colour: ~60% silver-lilac, ~25% violet/pink, ~10% teal, ~5% gold (the column dust);
  // Work's pocket beads carry their own (POCKET_HUES).
  float c = seed.y;
  vec3 hue = c < 0.6 ? uPalette[0] : c < 0.85 ? uPalette[1] : c < 0.95 ? uPalette[2] : uPalette[3];
#ifdef POCKET_HUES
  if (cloud.w > 0.0) hue = tint;
#endif
  hue = mix(vec3(dot(hue, vec3(0.299, 0.587, 0.114))), hue, uSaturation);
  // Brightness in tiers (most dim, a quarter medium, a few bright) and a slow random twinkle
  // (period 2–6 s), strong on the bright beads only.
  float tier = fract(seed.z * 7.13 + seed.w * 3.7);
  float period = 2.0 + seed.w * 4.0;
  float twinkle = pow(max(sin(uTime * 6.2831 / period + seed.z * 6.2831), 0.0), 14.0);
  float bright = 0.62 * grainTier(tier);
  // The tiny points dimmer still: most of the glitter is a faint haze of points.
  bright *= pick < 0.75 ? 0.75 : 1.0;
  float level = bright + twinkle * mix(1.8, 0.8, pocket) * mix(0.25, 1.0, grainGlints(tier)) + spark * 2.0;
  // Pocket grains: a little brighter where the cloud is dense (its core), the strays dimmer.
  level *= mix(1.0, mix(1.05, 0.6, smoothstep(0.3, 1.2, orbit.y)), pocket);
#ifdef FILAMENTS
  // Brighter near the active filaments (their pulses; the lit threads on hover).
  float filament = 0.0;
  for (int i = 0; i < FILAMENTS; i++) {
    vec3 a = uFilamentA[i].xyz;
    vec3 ab = uFilamentB[i].xyz - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    vec3 q = p - a - ab * h;
    filament = max(filament, uFilamentA[i].w * exp(-dot(q, q) / 0.3));
  }
  level *= 1.0 + filament * 2.5;
#endif
  vGlint = max(grainGlint(world.xyz, seed, uTime) * grainGlints(tier), stirred);
  // Out of focus: the light spreads over the disc (dimmer per pixel).
  float energy = clamp((focusSize * focusSize) / (size * size), 0.08, 1.0);
  vColor = grainLit(hue * level * energy * uBrightness, world.xyz);
}
