// An atmosphere grain: a tiny faceted glass crystal (diamond, four faces, bright rim, hot
// glint), not a round bokeh disc.
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = abs(c.x) + abs(c.y);
  float body = 1.0 - smoothstep(0.85, 1.0, d);
  if (body <= 0.0) discard;
  float face = 0.45 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
  float rim = smoothstep(0.5, 0.95, d);
  float glint = exp(-dot(c, c) * 12.0);
  vec3 color = vColor * (face * 0.8 + rim * 0.6) + vec3(1.0) * glint * 0.5 * length(vColor);
  gl_FragColor = vec4(color * body * vAlpha, 1.0);
}
