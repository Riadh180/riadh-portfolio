// An atmosphere grain: a dim glitter point with a hot core.
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  // Glitter: a soft point with a hot core.
  float shape = exp(-r * r * 9.0) * 1.2 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.25;
  vec3 muted = mix(vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), vColor, 0.55);
  gl_FragColor = vec4(muted * shape * vAlpha * 0.6, 1.0);
}
