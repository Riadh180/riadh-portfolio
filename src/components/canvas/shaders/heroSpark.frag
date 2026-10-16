// A spark: a hot point with a soft halo.
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float shape = exp(-r * r * 10.0) * 1.3 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.2;
  gl_FragColor = vec4(vColor * shape, 1.0);
}
