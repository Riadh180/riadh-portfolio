// A card's screen seen through thick, rippled glass (noise.glsl and dissolve.glsl are
// prepended in TS). The glass is cast, not sanded: the image behind it breaks into smeared
// streaks and shifted fragments, with small chromatic fringes where neighbouring
// fragments bend the light differently, and a milky grey-green tint over everything, so
// the card reads as a glass object first and an image second. The title stays crisp on
// top. uBlur smears it further for cards out of focus; uDissolve clears the glass from the
// edges in, leaving the sharp image.

uniform sampler2D uImage;
uniform sampler2D uTitle;
uniform float uBrightness;
uniform float uBlur;
uniform float uSeed;
uniform vec3 uHaze;
/** 0 frosted .. 1 fully cleared (the glass has broken away into particles). */
uniform float uDissolve;
uniform vec3 uEdgeGlow;
/** 1 for live scenes: darken the lower part here, where the title sits (covers are pre-shaded). */
uniform float uShade;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

float cellHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453);
}

void main() {
  // Defrost: the glass clears from the edges inward behind a fine front; past it the image
  // is sharp and clear. A faint bright seam marks the front.
  float threshold = dissolveThreshold(vUv, uSeed);
  float clear = clamp((uDissolve - threshold) / 0.06, 0.0, 1.0);
  float seam = uDissolve > 0.0 ? (1.0 - smoothstep(0.0, 0.03, abs(threshold - uDissolve))) : 0.0;
  float glass = 1.0 - clear;

  // Ripples: noise stretched along a slanted axis, so the image smears into streaks.
  vec2 p = vUv * vec2(2.6, 1.6) + uSeed * 7.0;
  vec2 slant = vec2(vUv.x * 0.8 + vUv.y * 0.35, vUv.y);
  float ripple = snoise(vec3(slant * vec2(9.0, 2.2) + uSeed, uSeed));
  float swell = snoise(vec3(p, uSeed + 3.0));

  // Fragments: the glass is cast in small, uneven cells (warped twice, so no grid shows),
  // each one shifting the image by its own amount, like crinkled glass (at_05).
  vec2 warp = vec2(snoise(vec3(p * 2.2, 5.0)), snoise(vec3(p * 2.2, 8.0))) * 0.9;
  warp += vec2(snoise(vec3(p * 7.0, 2.0)), snoise(vec3(p * 7.0, 6.0))) * 0.35;
  vec2 cell = floor(vUv * vec2(20.0, 13.0) + warp);
  vec2 shard = vec2(cellHash(cell), cellHash(cell + 19.3)) - 0.5;
  // Fine crinkle on top: the cells' edges are ragged, never straight.
  vec2 crinkle = vec2(snoise(vec3(vUv * vec2(26.0, 18.0), uSeed + 1.0)), snoise(vec3(vUv * vec2(26.0, 18.0), uSeed + 4.0)));

  vec2 shift = (vec2(ripple * 0.6, swell * 0.4) * 0.022 + shard * 0.03 + crinkle * 0.006) * glass;
  vec2 uv = vUv + shift;

  // Smear along the streaks: a few taps along the slant, longer out of focus. Each channel
  // bends by a slightly different amount (dispersion), so fringes appear wherever the
  // shift jumps, at the fragments' edges.
  vec2 along = normalize(vec2(0.35, 1.0)) * (0.012 + abs(ripple) * 0.02 + uBlur * 0.05) * glass;
  vec3 color = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    vec2 tap = uv + along * (float(i) / 4.0 - 0.5);
    color.r += texture2D(uImage, tap + shift * 0.22).r;
    color.g += texture2D(uImage, tap).g;
    color.b += texture2D(uImage, tap - shift * 0.22).b;
  }
  color /= 5.0;
  color *= 1.0 - uShade * 0.75 * smoothstep(0.55, 0.0, vUv.y);

  // Milky grey-green body: a base tint everywhere (the image sits inside the glass), thicker
  // where the glass swells and at grazing angles, a little brighter towards the top (lit
  // from above).
  float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  float milk = 0.38 + swell * 0.08 + grazing * 0.3 + (vUv.y - 0.5) * 0.1;
  color = mix(color, uHaze, clamp(milk, 0.0, 0.85) * glass);
  // The cast glass catches a little light along each ripple crest.
  color += uEdgeGlow * smoothstep(0.55, 0.95, ripple) * 0.035 * glass;

  vec4 title = texture2D(uTitle, vUv);
  // Open, the title moves to the details beside the image: it clears with the glass.
  color = mix(color, title.rgb, title.a * (1.0 - uBlur * 0.6) * glass);
  // The seam takes the image's own colour, lifted: the card burns away into its dust.
  color = color * mix(uBrightness, 1.05, clear) * (1.0 + seam * 0.8);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
