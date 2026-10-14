// A card's screen seen through thick, rippled glass (noise.glsl and dissolve.glsl are
// prepended in TS; the relief itself is baked once, see FrostField). The glass is cast,
// not sanded: the image behind it breaks into smeared streaks and shifted fragments, with small chromatic fringes where neighbouring
// fragments bend the light differently, and a milky grey-green tint over everything, so
// the card reads as a glass object first and an image second. The title stays crisp on
// top. uBlur smears it further for cards out of focus; uDissolve clears the glass from the
// edges in, leaving the sharp image.

uniform sampler2D uImage;
uniform sampler2D uTitle;
/** The baked cast-glass relief (FrostField). */
uniform sampler2D uField;
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

void main() {
  // Defrost: the glass clears from the edges inward behind a fine front; past it the image
  // is sharp and clear. A faint bright seam marks the front.
  float threshold = dissolveThreshold(vUv, uSeed);
  float clear = clamp((uDissolve - threshold) / 0.06, 0.0, 1.0);
  float seam = uDissolve > 0.0 ? (1.0 - smoothstep(0.0, 0.03, abs(threshold - uDissolve))) : 0.0;
  float glass = 1.0 - clear;

  // The cast relief, baked once per card (frostField.frag): image shift, ripple, swell.
  vec4 relief = texture2D(uField, vUv);
  float ripple = relief.z;
  float swell = relief.w;
  vec2 shift = relief.xy * glass;
  vec2 uv = vUv + shift;

  // Smear along the streaks: a few taps along the slant, longer out of focus. Each channel
  // bends by a slightly different amount (dispersion), so fringes appear wherever the
  // shift jumps, at the fragments' edges.
  vec2 along = normalize(vec2(0.35, 1.0)) * (0.012 + abs(ripple) * 0.02 + uBlur * 0.05) * glass;
  // Lite tier (integrated GPUs): fewer taps along the smear.
#ifdef LITE
  const int TAPS = 2;
#else
  const int TAPS = 5;
#endif
  vec3 color = vec3(0.0);
  for (int i = 0; i < TAPS; i++) {
    vec2 tap = uv + along * (float(i) / float(TAPS - 1) - 0.5);
    color.r += texture2D(uImage, tap + shift * 0.22).r;
    color.g += texture2D(uImage, tap).g;
    color.b += texture2D(uImage, tap - shift * 0.22).b;
  }
  color /= float(TAPS);
  color *= 1.0 - uShade * 0.75 * smoothstep(0.55, 0.0, vUv.y);

  // Milky grey-green body: a base tint everywhere (the image sits inside the glass), thicker
  // where the glass swells and at grazing angles, a little brighter towards the top (lit
  // from above).
  float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  // Saturated media under the glass (the reference's cards pop), then the milky body.
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, 1.2);
  float milk = 0.36 + swell * 0.08 + grazing * 0.3 + (vUv.y - 0.5) * 0.1;
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
