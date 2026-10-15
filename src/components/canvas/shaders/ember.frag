// An ember as a warm glass grain: a tiny faceted crystal with a hot glint.
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = abs(c.x) + abs(c.y);
  float body = 1.0 - smoothstep(0.85, 1.0, d);
  if (body <= 0.0) discard;
  float face = 0.5 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
  float glint = exp(-dot(c, c) * 10.0);
  gl_FragColor = vec4((uColor * face + vec3(1.0, 0.85, 0.6) * glint * 0.7) * body * vAlpha * 1.3, 1.0);
}
