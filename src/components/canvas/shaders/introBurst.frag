uniform vec3 uColors[3];
varying float vAlpha;
varying float vSeed;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float k = vSeed * 3.0;
  vec3 color = k < 1.0 ? uColors[0] : k < 2.0 ? uColors[1] : uColors[2];
  gl_FragColor = vec4(color * vAlpha * exp(-d * d * 3.0), 1.0);
}
