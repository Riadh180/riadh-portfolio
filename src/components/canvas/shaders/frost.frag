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
/** Hover: where the cursor is on the pane (uv) and how present (0..1): a soft defrost spot. */
uniform vec2 uCursor;
uniform float uHover;
/** Opened: a soft light band sweeping across once the image is sharp (-0.3 → 1.3). */
uniform float uSweep;
/** 1 for live scenes: darken the lower part here, where the title sits (covers are pre-shaded). */
uniform float uShade;
/** 0..1: lighter frost (live scenes, the capstone's dashboard) so the media read. */
uniform float uClarity;
/** Seconds, for the glint travelling round the edge line. */
uniform float uTime;
/** The pane's size (world units) and corner radius: for the edge line. */
uniform vec3 uPane;

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  // Defrost: the glass clears from the edges inward behind a fine front; past it the image
  // is sharp and clear. A faint bright seam marks the front.
  float threshold = dissolveThreshold(vUv, uSeed);
  float clear = clamp((uDissolve - threshold) / 0.06, 0.0, 1.0);
  float seam = uDissolve > 0.0 ? (1.0 - smoothstep(0.0, 0.03, abs(threshold - uDissolve))) : 0.0;
  // Hover: the frost thins round the cursor.
  float spot = uHover * (1.0 - smoothstep(0.08, 0.32, distance(vUv * vec2(1.6, 1.0), uCursor * vec2(1.6, 1.0))));
  float glass = (1.0 - clear) * (1.0 - spot * 0.75);

  // The cast relief, baked once per card (frostField.frag): image shift, ripple, swell.
  vec4 relief = texture2D(uField, vUv);
  float ripple = relief.z;
  float swell = relief.w;
  // Readable through the glass: the relief bends the image, it doesn't shatter it.
  // Capped, so text and logos bend and smear but never show as a crisp second copy.
  vec2 shift = relief.xy * glass * 0.32 * (1.0 - uClarity * 0.45);
  vec2 uv = vUv + shift;

  // Smear along the streaks: a few taps along the slant, longer out of focus. Each channel
  // bends by a slightly different amount (dispersion), so fringes appear wherever the
  // shift jumps, at the fragments' edges.
  vec2 along = normalize(vec2(0.35, 1.0)) * (0.006 + abs(ripple) * 0.01 + uBlur * 0.05) * glass;
  // A small, fixed dispersion along the bend (never a second offset image).
  vec2 fringe = length(shift) > 0.0001 ? normalize(shift) * 0.0022 * glass : vec2(0.0);
  // Lite tier (integrated GPUs): fewer taps along the smear.
#ifdef LITE
  const int TAPS = 2;
#else
  const int TAPS = 5;
#endif
  vec3 color = vec3(0.0);
  for (int i = 0; i < TAPS; i++) {
    vec2 tap = uv + along * (float(i) / float(TAPS - 1) - 0.5);
    color.r += texture2D(uImage, tap + fringe).r;
    color.g += texture2D(uImage, tap).g;
    color.b += texture2D(uImage, tap - fringe).b;
  }
  color /= float(TAPS);
  color *= 1.0 - uShade * 0.75 * smoothstep(0.55, 0.0, vUv.y);

  // Milky grey-green body: a base tint everywhere (the image sits inside the glass), thicker
  // where the glass swells and at grazing angles, a little brighter towards the top (lit
  // from above).
  float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  // The card family's shared grade: saturation held back, a cool violet lift in the
  // shadows, highlights kept but compressed (never brighter than the spine's highlights).
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, 0.82);
  color += vec3(0.03, 0.022, 0.055) * (1.0 - smoothstep(0.0, 0.35, luma));
  color = color / (1.0 + color * 0.3);
  float milk = (0.26 + swell * 0.08 + grazing * 0.3 + (vUv.y - 0.5) * 0.1) * (1.0 - uClarity * 0.4);
  color = mix(color, uHaze, clamp(milk, 0.0, 0.85) * glass);
  // The cast glass catches a little light along each ripple crest.
  color += uEdgeGlow * smoothstep(0.55, 0.95, ripple) * 0.035 * glass;

  vec4 title = texture2D(uTitle, vUv);
  // Open, the title moves to the details beside the image: it clears with the glass.
  color = mix(color, title.rgb, title.a * (1.0 - uBlur * 0.6) * glass);
  // The seam takes the image's own colour, lifted: the card burns away into its dust.
  color = color * mix(uBrightness, 1.05, clear) * (1.0 + seam * 0.8);
  // The glass edge: one continuous thin bright line just inside the pane's outline,
  // brighter on the side facing the light (top left), with a glint travelling round it.
  {
    vec2 p = (vUv - 0.5) * uPane.xy;
    float d = roundedBox(p, uPane.xy * 0.5, uPane.z) + 0.014;
    float w = fwidth(d) * 1.2;
    float edgeLine = 1.0 - smoothstep(0.0, w + 0.004, abs(d));
    float lit = 0.45 + 0.55 * clamp(dot(normalize(p), normalize(vec2(-0.6, 0.8))) * 0.5 + 0.5, 0.0, 1.0);
    float around = atan(p.y, p.x);
    float glint = pow(0.5 + 0.5 * sin(around - uTime * 0.9), 40.0);
    color += vec3(0.9, 0.95, 1.0) * edgeLine * (lit * 0.55 + glint * 1.2) * (1.0 - clear);
  }
  // The opening sweep: one soft diagonal band of light.
  float band = vUv.x + vUv.y * 0.35 - uSweep;
  color += vec3(1.0) * exp(-band * band * 90.0) * 0.22 * step(-0.5, uSweep) * clear;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
