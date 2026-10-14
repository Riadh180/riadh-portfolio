// A soft radial glow (additive): a warm light concentrated behind a subject.

uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  // Reaches zero well inside the plane: no visible edge.
  float glow = (exp(-r * r * 6.0) * 0.7 + exp(-r * r * 22.0) * 0.5) * (1.0 - smoothstep(0.55, 0.98, r));
  gl_FragColor = vec4(uColor * glow * uOpacity, 1.0);
}
