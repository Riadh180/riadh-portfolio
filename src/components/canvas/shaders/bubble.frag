// A bubble: a thin bright ring with a faint fill and a tiny highlight.
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float ring = smoothstep(0.7, 0.92, d) * (1.0 - smoothstep(0.92, 1.0, d));
  float highlight = 1.0 - smoothstep(0.0, 0.18, length(c - vec2(-0.18, 0.18)));
  gl_FragColor = vec4(uColor * vAlpha * (ring * 0.7 + 0.06 + highlight * 0.5), 1.0);
}
