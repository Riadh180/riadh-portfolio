// A glass bead: a dark tinted body, a darker edge, a thin iridescent rim and one hot
// specular glint; each bead has its own brightness (a few bright glints, many dim). Out of
// focus (near the lens or far away) it goes soft: lower contrast, more transparent.
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
  // Darker towards the edge, then a thin bright iridescent rim right at it.
  float edge = 1.0 - facing;
  float rim = smoothstep(0.72, 0.95, edge);
  vec3 light = normalize(vec3(-0.5, 0.8, 0.5));
  float glint = pow(max(dot(reflect(-light, n), vView), 0.0), 40.0);
  // Strong variation: most beads dim, a few bright.
  float level = mix(0.25, 1.6, pow(fract(vSeed * 13.7), 3.0));
  vec3 body = vTint * (0.12 + 0.3 * facing * facing);
  vec3 color = body + film(facing * 1.4 + vSeed * 2.0) * rim * 0.9 + vec3(1.0) * glint * 2.4;
  color *= level * uBrightness;
  float alpha = mix(0.95, 0.25, vSoft);
  color = mix(color, vTint * 0.3 * level * uBrightness, vSoft * 0.6);
  gl_FragColor = vec4(color, alpha);
}
