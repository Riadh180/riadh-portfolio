// A small chip of coloured glass: an irregular faceted shape (not a disc), slightly
// see-through, with a bright glint where a facet catches the light. Out of focus it
// becomes a soft, faint bokeh disc.

varying vec3 vColor;
varying float vBlur;
varying float vPointSize;
varying float vShape;
varying float vGlint;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  float angle = atan(c.y, c.x);
  // 4–6 uneven facets: the outline is a rough polygon.
  float sides = 4.0 + floor(vShape * 3.0);
  float facet = cos(floor(0.5 + (angle + vShape * 6.28) * sides / 6.28318) * 6.28318 / sides - angle - vShape * 6.28);
  float edge = mix(r * facet / 0.82, r, vBlur);
  float aa = 2.0 / vPointSize;
  float body = 1.0 - smoothstep(1.0 - aa, 1.0, edge);
  if (body <= 0.0) discard;

  // Lit from one side: a soft gradient across the chip, and a glint near its lit edge.
  vec2 light = vec2(cos(vShape * 6.28), sin(vShape * 6.28));
  float side = 0.5 + 0.5 * dot(c, light);
  float glint = smoothstep(0.55, 0.95, side) * smoothstep(1.0, 0.6, edge);
  vec3 color = vColor * (0.45 + 0.8 * side) + vec3(vGlint + 0.25) * glint * (1.0 - vBlur);
  float alpha = body * mix(0.6, 0.22, vBlur);
  gl_FragColor = vec4(color, alpha);
}
