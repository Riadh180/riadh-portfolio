// Glass in the card scenes (no environment there): a dark, faintly lit body with a bright
// rim where the surface turns away, its hue sliding along the palette with the angle (a
// cheap thin-film), and a soft top light.
uniform vec3 uBase;
uniform vec3 uRim[3];
uniform float uGlow;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vView;

vec3 ramp(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uRim[0], uRim[1], x);
  if (x < 2.0) return mix(uRim[1], uRim[2], x - 1.0);
  return mix(uRim[2], uRim[0], x - 2.0);
}

void main() {
  vec3 n = normalize(vNormal);
  float facing = abs(dot(n, normalize(vView)));
  float rim = pow(1.0 - facing, 2.2);
  vec3 hue = ramp(n.x * 0.35 + n.y * 0.25 + uTime * 0.05);
  vec3 color = uBase * (0.6 + 0.4 * n.y) + hue * rim * uGlow + vec3(1.0) * pow(max(n.y, 0.0), 12.0) * 0.25;
  gl_FragColor = vec4(color, 1.0);
}
