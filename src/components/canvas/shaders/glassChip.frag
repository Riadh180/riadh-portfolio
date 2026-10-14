// A glass chip: a dark tinted body, bright rims where its facets turn away, an
// iridescent glint sliding over the facets as it tumbles past the light. Out of focus
// (close to the lens or far away) it goes soft: lower contrast, more transparent.
uniform float uBrightness;
uniform vec3 uFilm[3];

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vTint;
varying float vSoft;
varying float vSeed;

vec3 film(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uFilm[0], uFilm[1], x);
  if (x < 2.0) return mix(uFilm[1], uFilm[2], x - 1.0);
  return mix(uFilm[2], uFilm[0], x - 2.0);
}

void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  float facing = abs(dot(n, vView));
  float rim = pow(1.0 - facing, 2.5);
  // A key light from above right: facets flash as they pass it.
  vec3 light = normalize(vec3(0.5, 0.8, 0.4));
  float glint = pow(max(dot(reflect(-light, n), vView), 0.0), 28.0);
  vec3 body = vTint * (0.22 + 0.25 * facing);
  vec3 iridescent = film(facing * 1.3 + vSeed * 2.0) * (rim * 0.9 + glint * 1.6);
  vec3 color = (body + vTint * rim * 0.6 + iridescent + vec3(1.0) * glint * 0.8) * uBrightness;
  float alpha = mix(0.92, 0.28, vSoft);
  color = mix(color, vTint * 0.35 * uBrightness, vSoft * 0.6);
  gl_FragColor = vec4(color, alpha);
}
