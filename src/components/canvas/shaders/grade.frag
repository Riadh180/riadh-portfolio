// The site's one grade (postprocessing Effect), applied to every place alike, so the whole
// journey reads as one world. Measured against the reference recording: a lifted, cool
// black; shadows leaning cool; mid-tones muted; nothing allowed to go neon; fine grain.
// `resolution` and `time` are provided by the EffectPass. Works in linear light.

uniform float uContrast;
uniform float uGrain;
uniform float uVignette;
/** The black floor (linear): blacks lift to a cool charcoal, never to pure black. */
uniform vec3 uLift;
/** Tint pushed into the shadows (split-tone), and how strongly. */
uniform vec3 uShadowTint;
uniform float uShadowAmount;
/** Global saturation, and the ceiling on how saturated any colour may get. */
uniform float uSaturation;
uniform float uSaturationCeiling;

// Tone mapping with a shoulder only: darks stay exactly on the palette tokens,
// HDR highlights (bloom cores) roll off softly instead of clipping.
vec3 shoulder(vec3 x) {
  const float knee = 0.6;
  vec3 over = max(x - knee, 0.0);
  return min(x, vec3(knee)) + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
}

// Hash without sine (Dave Hoskins, MIT): no line patterns at large pixel coordinates.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = max(inputColor.rgb, 0.0);

  // Contrast around linear mid-grey: deeper blacks without crushing the glow.
  color = pow(color / 0.18, vec3(uContrast)) * 0.18;
  color = shoulder(color);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Saturation: muted overall, and a soft ceiling so no place goes neon (Depth's teal,
  // Contact's ember): colour beyond the ceiling is compressed, not clipped.
  vec3 chroma = (color - luma) * uSaturation;
  float amount = length(chroma) / max(luma, 1e-4);
  chroma *= amount > uSaturationCeiling
    ? (uSaturationCeiling + (amount - uSaturationCeiling) * 0.25) / amount
    : 1.0;
  color = max(luma + chroma, 0.0);

  // Split-tone: the shadows lean cool teal-grey, the highlights stay neutral.
  float shadow = 1.0 - smoothstep(0.0, 0.08, luma);
  color += uShadowTint * shadow * uShadowAmount * 0.01;

  vec2 d = uv - 0.5;
  color *= 1.0 - dot(d, d) * uVignette;

  // Lift, after the vignette, so the black floor is the same cool charcoal everywhere in
  // the frame and in every place (the reference never shows pure black).
  color = uLift + color * (1.0 - uLift);

  // Animated film grain, plus dithering that removes gradient banding.
  vec2 px = uv * resolution;
  float grain = hash(px + floor(fract(time * 0.37) * 4096.0)) - 0.5;
  color += grain * uGrain * (0.04 + sqrt(luma));
  color += (hash(px + 0.37) - 0.5) / 255.0;

  outputColor = vec4(color, inputColor.a);
}
