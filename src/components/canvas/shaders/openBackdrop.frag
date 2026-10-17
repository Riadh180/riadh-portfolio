// The backdrop behind an opened card (noise.glsl prepended): the scene falls back into smoke
// and darkness (at_08), so only the card and its details read. Full tier: the scene without
// the card (uScene, a quarter of the screen's resolution) blurred and darkened, under a slow
// drift of streaky smoke; lite: the darkening smoke alone over the scene (uLite).
uniform sampler2D uScene;
/** The drawing buffer's size (px) and uScene's texel. */
uniform vec2 uResolution;
uniform vec2 uTexel;
/** 0 closed → 1 open. */
uniform float uAmount;
uniform float uTime;
uniform float uLite;
/** How much of the scene's light is left (≈ 45%), and the smoke's colour and strength. */
uniform float uKeep;
uniform vec3 uSmoke;
uniform float uSmokeAmount;

/** The scene round `uv`, softened: a centre tap and two rings of six. */
vec3 blurred(vec2 uv) {
  vec3 sum = texture2D(uScene, uv).rgb * 2.0;
  float weight = 2.0;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.0472;
    vec2 d = vec2(cos(a), sin(a)) * uTexel;
    sum += texture2D(uScene, uv + d * 1.6).rgb * 1.5;
    sum += texture2D(uScene, uv + d * 3.4 + vec2(-d.y, d.x) * 0.8).rgb;
    weight += 2.5;
  }
  return sum / weight;
}

/**
 * Streaky smoke drifting slowly sideways (stretched along x), 0..1. Lite: a still fog, thicker
 * towards the bottom (a full-screen pass: the integrated GPUs feel every noise layer).
 */
float smoke(vec2 uv) {
  if (uLite > 0.5) return 0.75 - 0.35 * uv.y;
  vec2 p = uv * vec2(1.6, 4.5);
  float t = uTime * 0.035;
  float n = snoise(vec3(p + vec2(t, 0.0), t * 0.7)) * 0.55;
  n += snoise(vec3(p * 2.1 + vec2(-t * 1.4, 0.3), t)) * 0.3;
  n += snoise(vec3(p * 4.3 + vec2(t * 2.0, 1.7), t * 1.3)) * 0.15;
  return clamp(n * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float s = smoke(uv);
  // Dark between brighter wisps.
  vec3 fog = uSmoke * (0.1 + 2.4 * s * s * s);
  if (uLite > 0.5) {
    // Darken by blending dark smoke over the scene.
    gl_FragColor = vec4(fog * uSmokeAmount, uAmount * (1.0 - uKeep));
    return;
  }
  vec3 color = blurred(uv) * uKeep + fog * uSmokeAmount;
  gl_FragColor = vec4(color, uAmount);
}
