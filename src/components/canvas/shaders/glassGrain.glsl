// One glass bead for every particle sprite in the world (fragment side, see grainMotion.glsl
// for the vertex side). Tiny beads (a pixel or two) are soft points of light; from a few pixels
// up a bead is a small piece of glass, as in the reference's clouds: a darker, see-through
// core, a thin bright fresnel edge tinted by thin film along its angle (teal → pink → gold),
// one sharp sparkle on the side its place's light comes from (brighter as the bead turns
// through that light or is stirred), and on the larger beads a chromatic split of at most half
// a pixel at the edge. On the full tier at Work, medium and large beads bend the scene behind
// them like little ball lenses (inverted and a little magnified in the middle, the
// surroundings drawn in at the rim): they replace what is behind them with what they refract
// (premultiplied output: alpha is how much of the background the bead takes; 0 = additive).
// Out of focus, a bead is a bokeh disc with a faint bright edge (grainBokeh).

uniform vec3 uGrainFilm[3];
/** The place's light colour (particles/CursorField.tsx): the sparkles take it. */
uniform vec3 uGrainLightColor;
/** The place's light direction in view space: the side of a bead its sparkle sits on. */
uniform vec3 uGrainLightView;
/** What the beads refract (particles/grainScene.ts), whether it is there, the frame's size. */
uniform sampler2D uGrainScene;
uniform float uGrainSceneOn;
uniform vec2 uGrainResolution;

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
 * An out-of-focus bead: a soft disc, its light spread thin, with the faint bright edge real
 * out-of-focus glass shows.
 */
vec3 grainBokeh(vec2 c, vec3 tint) {
  float r = length(c);
  float fill = 1.0 - smoothstep(0.6, 1.0, r);
  float edge = smoothstep(0.6, 0.84, r) * (1.0 - smoothstep(0.84, 1.0, r));
  return tint * (fill * 0.3 + edge * 0.28);
}

/**
 * c: sprite coordinate (-1..1, y up); size: sprite size in px; tint: the bead's colour (its
 * brightness included); glint: 0..1 how squarely it catches the light now (or is stirred by
 * the cursor); phase: per-bead 0..1 (its film and turn).
 * Returns premultiplied colour: rgb to add, alpha the share of the background it replaces.
 */
vec4 glassGrain(vec2 c, float size, vec3 tint, float glint, float phase) {
  float r = length(c);
  float level = length(tint);
  vec3 light = uGrainLightColor / max(dot(uGrainLightColor, vec3(0.2126, 0.7152, 0.0722)), 0.05);
  // A point of light: a soft core and a faint halo (not a hot pixel).
  float point = exp(-r * r * 6.0) * 0.9 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.3;
  vec3 spark = tint * point + light * point * glint * 0.6 * level;
  float bead = smoothstep(2.2, 4.5, size);
  if (bead <= 0.0) return vec4(spark, 0.0);
  float px = 2.0 / max(size, 1.0);
  float body = 1.0 - smoothstep(GRAIN_EDGE - 1.3 * px, GRAIN_EDGE, r);
  float x = clamp(r / GRAIN_EDGE, 0.0, 1.0);
  // Glass: a filled body, a little darker in the middle, the light gathered towards the rim
  // (fresnel).
  float fresnel = x * x;
  vec3 color = tint * (0.5 + 0.3 * fresnel) * body;
  // A thin bright edge, tinted by thin film whose hue turns round the bead.
  float a = atan(c.y, c.x);
  vec3 film = grainFilmRamp(a / 6.2831 + phase);
  float edge = smoothstep(GRAIN_EDGE - 1.6 * px - 0.06, GRAIN_EDGE - 0.5 * px, r) * body;
  color += mix(vec3(level), film * level, 0.65) * edge * 0.24;
  // A chromatic split of at most half a pixel, on the larger beads only: red just outside the
  // edge, a touch of blue just inside.
  float large = smoothstep(8.0, 16.0, size);
  float outside = smoothstep(GRAIN_EDGE - 0.25 * px, GRAIN_EDGE, r) *
    (1.0 - smoothstep(GRAIN_EDGE, GRAIN_EDGE + 0.5 * px, r));
  color.r += outside * level * 0.14 * large;
  color.b += edge * level * 0.06 * large;
  // One sharp sparkle on the side the place's light comes from: always a little, bright as the
  // bead turns through the light or the cursor stirs it.
  vec2 toward = uGrainLightView.xy / max(length(uGrainLightView.xy), 0.001) * 0.4;
  vec2 g = c - toward;
  color += light * exp(-dot(g, g) * 110.0) * (0.28 + glint * 1.7) * level * body;
  float alpha = 0.0;
#ifndef GRAIN_LITE
  // The medium and large beads bend what is behind them: a ball lens, inverted and a little
  // magnified in the middle, the surroundings drawn in at the rim; a little light lost in the
  // glass. Without the picture (lite, phones, other places): the light it lets through,
  // focused on its far side.
  float lens = smoothstep(4.5, 9.0, size) * uGrainSceneOn;
  if (lens > 0.0) {
    vec2 uv = gl_FragCoord.xy / uGrainResolution;
    vec2 radius = vec2(size * 0.5 * GRAIN_EDGE) / uGrainResolution;
    vec2 offset = c * radius * (-1.7 + 2.3 * x * x);
    vec3 behind = texture2D(uGrainScene, uv + offset).rgb;
    if (large > 0.0) {
      // Dispersion: red and blue bend a little apart (well under half a pixel).
      behind.r = mix(behind.r, texture2D(uGrainScene, uv + offset * 1.03).r, large);
      behind.b = mix(behind.b, texture2D(uGrainScene, uv + offset * 0.97).b, large);
    }
    alpha = body * lens * 0.55;
    color += behind * (0.75 + 0.2 * fresnel) * alpha;
  } else {
    vec2 k = c - vec2(0.28, -0.3);
    color += film * level * exp(-dot(k, k) * 9.0) * 0.14 * body;
  }
#endif
  return vec4(mix(spark, color, bead), alpha * bead);
}
