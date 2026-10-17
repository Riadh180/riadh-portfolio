// One glass bead for every particle sprite in the world (fragment side, see grainMotion.glsl
// for the vertex side). Tiny beads (a pixel or two) are soft points; from a few pixels up a
// bead is a small round drop of glass, as in the reference's clouds: a soft round silhouette,
// a filled, slightly darker middle with the light gathered towards its rim (fresnel), the rim
// tinted by thin film along its angle (teal → pink → gold), one small glint up and to the left
// (the bright beads only: the vertex side gates `glint`), a chromatic fringe of at most half a
// pixel on the larger beads only, and on the full tier the light it lets through focused on
// its far side (a soft caustic, a cheap stand-in for refraction).

uniform vec3 uGrainFilm[3];
/** The place's light colour (particles/CursorField.tsx): the glints take it. */
uniform vec3 uGrainLightColor;

vec3 grainFilmRamp(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uGrainFilm[0], uGrainFilm[1], x);
  if (x < 2.0) return mix(uGrainFilm[1], uGrainFilm[2], x - 1.0);
  return mix(uGrainFilm[2], uGrainFilm[0], x - 2.0);
}

/** The bead's edge (sprite radius 1 = the sprite's edge). */
const float GRAIN_EDGE = 0.9;

/**
 * How much of the sprite a bead covers (0..1): a soft round body, its edge antialiased over
 * about a pixel. For beads drawn with normal blending (a card's dissolve dust).
 */
float grainBody(vec2 c, float size, float phase) {
  float r = length(c);
  float disc = 1.0 - smoothstep(0.55, 1.0, r);
  float bead = smoothstep(2.2, 4.5, size);
  if (bead <= 0.0) return disc;
  float px = 2.0 / max(size, 1.0);
  return mix(disc, 1.0 - smoothstep(GRAIN_EDGE - 1.3 * px, GRAIN_EDGE, r), bead);
}

/**
 * c: sprite coordinate (-1..1, y up); size: sprite size in px; tint: the bead's colour (its
 * brightness included); glint: 0..1 how squarely it catches the light now (0 for all but the
 * bright beads, unless the cursor stirs it); phase: per-bead 0..1 (its film and turn).
 * Returns additive colour.
 */
vec3 glassGrain(vec2 c, float size, vec3 tint, float glint, float phase) {
  float r = length(c);
  float level = length(tint);
  vec3 light = uGrainLightColor / max(dot(uGrainLightColor, vec3(0.2126, 0.7152, 0.0722)), 0.05);
  // A point of light: a soft core and a faint halo (not a hot pixel).
  float point = exp(-r * r * 6.0) * 0.9 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.3;
  vec3 spark = tint * point + light * point * glint * 0.6 * level;
  float bead = smoothstep(2.2, 4.5, size);
  if (bead <= 0.0) return spark;
  float px = 2.0 / max(size, 1.0);
  float body = 1.0 - smoothstep(GRAIN_EDGE - 1.3 * px, GRAIN_EDGE, r);
  // Glass: a slightly darker middle (a filled drop, not a hollow bubble), the light gathered
  // towards the rim.
  float x = clamp(r / GRAIN_EDGE, 0.0, 1.0);
  vec3 color = tint * (0.6 + 0.3 * x * x * x) * body;
  // The rim, tinted by thin film whose hue turns round the bead.
  float a = atan(c.y, c.x);
  vec3 film = grainFilmRamp(a / 6.2831 + phase);
  float rim = smoothstep(GRAIN_EDGE - 3.0 * px - 0.18, GRAIN_EDGE - 0.6 * px, r) * body;
  color += film * rim * 0.22 * level;
  // A chromatic fringe of at most half a pixel, on the larger beads only: red just outside the
  // edge, a touch of blue just inside.
  float large = smoothstep(8.0, 16.0, size);
  float outside = smoothstep(GRAIN_EDGE - 0.25 * px, GRAIN_EDGE, r) *
    (1.0 - smoothstep(GRAIN_EDGE, GRAIN_EDGE + 0.5 * px, r));
  color.r += outside * level * 0.14 * large;
  color.b += rim * level * 0.05 * large;
  // One small glint, up and to the left, in the light's colour.
  vec2 g = c - vec2(-0.3, 0.32);
  color += light * exp(-dot(g, g) * 55.0) * glint * 1.5 * level * body;
#ifndef GRAIN_LITE
  // The light it lets through, focused on the far side: refraction, read as glass.
  vec2 k = c - vec2(0.28, -0.3);
  color += film * level * exp(-dot(k, k) * 9.0) * 0.18 * body;
#endif
  return mix(spark, color, bead);
}
