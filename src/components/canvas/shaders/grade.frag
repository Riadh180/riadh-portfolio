// Final grade (postprocessing Effect). Neutral: no color is added to the shadows.
// `resolution` and `time` are provided by the EffectPass.

uniform float uContrast;
uniform float uGrain;
uniform float uVignette;

// Tone mapping with a shoulder only: darks stay exactly on the palette tokens,
// HDR highlights (bloom cores) roll off softly instead of clipping.
vec3 shoulder(vec3 x) {
  const float knee = 0.6;
  vec3 over = max(x - knee, 0.0);
  return min(x, vec3(knee)) + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = max(inputColor.rgb, 0.0);

  // Contrast around linear mid-grey: deeper blacks without crushing the glow.
  color = pow(color / 0.18, vec3(uContrast)) * 0.18;
  color = shoulder(color);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

  vec2 d = uv - 0.5;
  color *= 1.0 - dot(d, d) * uVignette;

  // Animated film grain, plus dithering that removes gradient banding.
  vec2 px = uv * resolution;
  float grain = hash(px + fract(time * 7.13) * 100.0) - 0.5;
  color += grain * uGrain * (0.04 + sqrt(luma));
  color += (hash(px + 0.37) - 0.5) / 255.0;

  outputColor = vec4(color, inputColor.a);
}
