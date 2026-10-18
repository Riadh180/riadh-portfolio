// A glitter bead (glassGrain.glsl): a soft point when tiny, a round glass bead when larger;
// out of focus a bokeh disc, its light spread thin; the few sparks keep a faceted look.
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
  vec4 grain = glassGrain(c, vPointSize * (1.0 - vSoft), vColor, vGlint, vPhase);
  // Out of focus: a bokeh disc, its light spread thin, a faint bright edge.
  vec3 color = mix(grain.rgb, grainBokeh(c, vColor) * 1.15, vSoft);
  float alpha = grain.a * (1.0 - vSoft);
  if (vSpark > 0.5 && vSoft < 0.5) {
    float d = abs(c.x) + abs(c.y);
    float body = 1.0 - smoothstep(0.85, 1.0, d);
    float face = 0.45 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
    color = vColor * body * (face * 0.6 + exp(-r * r * 9.0) * 1.5);
    alpha = 0.0;
  }
  gl_FragColor = vec4(color, alpha);
}
