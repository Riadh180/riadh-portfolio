// An ember as a warm glass bead.
uniform vec3 uColor;
varying float vAlpha;

// A glass bead on a point sprite: dark tinted body, darker edge, a thin bright rim and a
// hot glint up-left; `level` scales it (most beads dim, a few bright). Returns colour.
vec3 bead(vec2 c, vec3 tint, float level) {
  float r = length(c);
  float body = 1.0 - smoothstep(0.86, 1.0, r);
  float rim = smoothstep(0.62, 0.86, r) * (1.0 - smoothstep(0.86, 1.0, r));
  float glint = exp(-dot(c - vec2(-0.3, 0.32), c - vec2(-0.3, 0.32)) * 22.0);
  vec3 color = tint * (0.35 - 0.2 * r) + tint * rim * 1.1 + vec3(1.0) * glint * 1.3 * length(tint);
  return color * body * level;
}

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  if (length(c) > 1.0) discard;
  gl_FragColor = vec4(bead(c, uColor, 1.4) * vAlpha, 1.0);
}
