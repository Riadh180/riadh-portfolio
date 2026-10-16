// A glitter grain: a glass grain (glassGrain.glsl): a bright point when tiny, a glass bead
// when larger; out of focus a soft disc with low alpha; the few sparks keep a faceted look.
varying vec3 vColor;
varying float vSoft;
varying float vSpark;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  float r = length(c);
  if (r > 1.0) discard;
  vec3 color = glassGrain(c, vPointSize * (1.0 - vSoft), vColor, vGlint, vPhase);
  // Out of focus: a soft disc, its light spread thin.
  vec3 disc = vColor * (1.0 - smoothstep(0.75, 1.0, r)) * 0.35;
  color = mix(color, disc, vSoft);
  if (vSpark > 0.5 && vSoft < 0.5) {
    float d = abs(c.x) + abs(c.y);
    float body = 1.0 - smoothstep(0.85, 1.0, d);
    float face = 0.45 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
    color = vColor * body * (face * 0.6 + exp(-r * r * 9.0) * 1.5);
  }
  gl_FragColor = vec4(color, 1.0);
}
