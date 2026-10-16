// One glass grain for every particle sprite in the world (fragment side, see grainMotion.glsl
// for the vertex side). Tiny grains (a pixel or two) are bright points; from a few pixels up
// a grain is a chip of glass, as in the reference's clouds: an irregular polygon of five to
// seven facets, each lit its own way, a slightly see-through (darker) middle, a thin rim
// tinted by thin film along its angle (teal → pink → gold), a faint chromatic fringe on the
// edge, one sharp glint up and to the left that flares as the chip turns through the light,
// and on the full tier the light it lets through focused on its far side (a soft caustic, a
// cheap stand-in for refraction: there is no scene buffer to bend at most places).

uniform vec3 uGrainFilm[3];
/** The place's light colour (particles/CursorField.tsx): the glints take it. */
uniform vec3 uGrainLightColor;

vec3 grainFilmRamp(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uGrainFilm[0], uGrainFilm[1], x);
  if (x < 2.0) return mix(uGrainFilm[1], uGrainFilm[2], x - 1.0);
  return mix(uGrainFilm[2], uGrainFilm[0], x - 2.0);
}

/**
 * c: sprite coordinate (-1..1, y up); size: sprite size in px; tint: the grain's colour (its
 * brightness included); glint: 0..1 how squarely it catches the light now (tumbling);
 * phase: per-grain 0..1 (its facets, film and turn). Returns additive colour.
 */
vec3 glassGrain(vec2 c, float size, vec3 tint, float glint, float phase) {
  float r = length(c);
  // A point of light: a soft core and a faint halo (not a hot pixel: a cloud of them reads
  // as glitter, not as a field of single sparks).
  float point = exp(-r * r * 6.0) * 0.9 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.3;
  vec3 spark = tint * point + uGrainLightColor * point * glint * 1.2 * length(tint);
  float chip = smoothstep(2.2, 4.5, size);
  if (chip <= 0.0) return spark;
  float px = 2.0 / max(size, 1.0);
  // The silhouette: an irregular polygon, its flat edges each at their own distance.
  float n = 5.0 + floor(fract(phase * 3.7) * 3.0);
  float a = atan(c.y, c.x) - phase * 6.2831;
  float sector = floor((a / 6.2831 + 0.5) * n);
  float h = fract(sin(sector * 12.9898 + phase * 78.233) * 43758.5453);
  float centre = ((sector + 0.5) / n - 0.5) * 6.2831;
  float toEdge = r * cos(a - centre) / cos(3.14159 / n);
  float edge = 0.8 + 0.18 * h;
  float body = 1.0 - smoothstep(edge - 1.4 * px, edge, toEdge);
  // Facets: each a little brighter or darker; the middle a touch darker (see-through glass).
  vec3 color = tint * (0.55 + 0.45 * h) * body;
  color *= 1.0 - (1.0 - smoothstep(0.0, 0.7, toEdge)) * 0.3;
  // The rim: thin, tinted by the film; a faint chromatic fringe (red just outside, blue
  // just inside the edge).
  float rim = smoothstep(edge - 3.2 * px, edge - 1.0 * px, toEdge) * body;
  vec3 film = grainFilmRamp(a / 6.2831 + phase);
  float level = length(tint);
  color += film * rim * 0.5 * level;
  float outside = (1.0 - smoothstep(edge - 0.4 * px, edge + 0.8 * px, toEdge)) - body;
  color.r += max(outside, 0.0) * level * 0.22;
  color.b += rim * level * 0.12;
  // The glint, up and to the left, flaring as the chip turns through the light; it takes the
  // light's colour (copper in the hero's warm moment, warm at Contact).
  vec2 g = c - vec2(-0.32, 0.36);
  vec3 light = uGrainLightColor / max(dot(uGrainLightColor, vec3(0.2126, 0.7152, 0.0722)), 0.05);
  color += light * exp(-dot(g, g) * 30.0) * (0.15 + 1.6 * glint) * level * body;
#ifndef GRAIN_LITE
  // The light it lets through, focused on the far side: refraction, read as glass.
  vec2 k = c - vec2(0.3, -0.3);
  color += film * level * exp(-dot(k, k) * 8.0) * 0.28 * body;
#endif
  return mix(spark, color, chip);
}
