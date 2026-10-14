uniform vec3 uColors[3];
uniform float uOpacity;
varying float vTwinkle;
varying float vSeed;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float k = vSeed * 3.0;
  vec3 color = k < 1.0 ? uColors[0] : k < 2.0 ? uColors[1] : uColors[2];
  gl_FragColor = vec4(color * vTwinkle * uOpacity * (1.0 - d * d), 1.0);
}
