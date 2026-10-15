// A glass grain (point sprite, motes.vert): in focus, a tiny faceted crystal (a diamond with
// four differently lit faces, a bright rim and a hot glint at its heart); far out of focus,
// a small soft disc. Replaces round dots in the transitions and Depth.
varying vec3 vColor;
varying float vBlur;
varying float vPointSize;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  if (vBlur > 0.6) {
    float disc = 1.0 - smoothstep(0.6, 1.0, length(c));
    if (disc <= 0.0) discard;
    gl_FragColor = vec4(vColor * disc * 0.5, 1.0);
    return;
  }
  float d = abs(c.x) + abs(c.y);
  float aa = 2.0 / max(vPointSize, 1.0);
  float body = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  if (body <= 0.0) discard;
  float face = 0.45 + 0.2 * step(0.0, c.x) + 0.3 * step(0.0, c.y);
  float rim = smoothstep(0.55, 0.95, d);
  float glint = exp(-dot(c, c) * 12.0);
  vec3 color = vColor * (face * 0.8 + rim * 0.7) + vec3(1.0) * glint * 0.6 * length(vColor);
  gl_FragColor = vec4(color * body, 1.0);
}
