// A node: a dark glass bead with a thin bright ring and a soft glowing core.

varying vec3 vColor;
varying float vLit;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float ring = smoothstep(0.72, 0.84, r) * (1.0 - smoothstep(0.9, 1.0, r));
  float core = exp(-r * r * 9.0);
  float body = (1.0 - smoothstep(0.82, 0.9, r)) * 0.18;
  vec3 color = vColor * (ring * (0.8 + vLit) + core * (0.5 + vLit * 1.6)) + vColor * body;
  gl_FragColor = vec4(color, 1.0);
}
