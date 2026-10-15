// Halation: a warm red-orange halo bleeding round the brightest highlights only (above
// the bloom threshold), small radius, low strength: on glass edges and sparks, like light
// scattering back through film. Full tier only.
uniform float uThreshold;
uniform float uStrength;
uniform vec3 uTint;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 halo = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    vec2 offset = vec2(cos(a), sin(a)) * texelSize * 5.0;
    vec3 tap = texture2D(inputBuffer, uv + offset).rgb;
    float l = dot(tap, vec3(0.2126, 0.7152, 0.0722));
    halo += max(l - uThreshold, 0.0);
  }
  outputColor = vec4(inputColor.rgb + uTint * (halo / 8.0) * uStrength, inputColor.a);
}
