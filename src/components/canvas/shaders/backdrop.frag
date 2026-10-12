// Deep background: the base color plus very soft colored light pools that sit
// where the scene lights project on screen, so the space and the particles agree.

uniform vec3 uBackground;
uniform vec2 uPools[3];
uniform vec3 uPoolColors[3];
uniform float uPoolStrength;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec3 color = uBackground;

  for (int i = 0; i < 3; i++) {
    vec2 d = vUv - uPools[i];
    d.x *= uAspect;
    color += uPoolColors[i] * exp(-dot(d, d) * 5.0) * uPoolStrength;
  }

  // Keep the center calm: the light lives at the edges.
  vec2 centered = vUv - 0.5;
  centered.x *= uAspect;
  color = mix(uBackground, color, smoothstep(0.25, 0.95, length(centered)));

  gl_FragColor = vec4(color, 1.0);
}
