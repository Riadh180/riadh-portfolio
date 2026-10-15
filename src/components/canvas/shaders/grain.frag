// A glitter grain (point sprite, motes.vert): a soft point with a hot core; far out of
// focus a small soft disc.
varying vec3 vColor;
varying float vBlur;
varying float vPointSize;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  // Glitter: a soft point with a hot core.
  float shape = exp(-r * r * 9.0) * 1.2 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.25;
  if (vBlur > 0.6) shape = (1.0 - smoothstep(0.6, 1.0, r)) * 0.4;
  vec3 muted = mix(vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), vColor, 0.6);
  gl_FragColor = vec4(muted * shape, 1.0);
}
