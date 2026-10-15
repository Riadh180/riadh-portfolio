// A glitter grain: a soft point with a hot core; out of focus a soft disc with low alpha;
// the few sparks keep a faceted glass look (four lit faces and a glint).
varying vec3 vColor;
varying float vSoft;
varying float vSpark;
varying float vPointSize;
varying float vPocket;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float core = exp(-r * r * 9.0);
  float halo = 1.0 - smoothstep(0.2, 1.0, r);
  float point = core * 1.2 + halo * 0.25;
  float disc = (1.0 - smoothstep(0.75, 1.0, r)) * 0.35;
  // Pocket grains (the spine's foam): soft filled discs with a faint lit rim, like beads.
  point = mix(point, (1.0 - smoothstep(0.6, 1.0, r)) * 0.55 + smoothstep(0.5, 0.85, r) * (1.0 - smoothstep(0.85, 1.0, r)) * 0.3, vPocket);
  float shape = mix(point, disc, vSoft);
  if (vSpark > 0.5 && vSoft < 0.5) {
    float d = abs(c.x) + abs(c.y);
    float body = 1.0 - smoothstep(0.85, 1.0, d);
    float face = 0.45 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
    shape = body * (face * 0.6 + core * 1.5);
  }
  gl_FragColor = vec4(vColor * shape, 1.0);
}
