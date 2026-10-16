// A dust grain (motes.vert with GRAIN): the world's glass grain (glassGrain.glsl), muted;
// far out of focus a small soft disc. Trails, transition walls and Depth's plankton.
varying vec3 vColor;
varying float vBlur;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  float r = length(c);
  if (r > 1.0) discard;
  vec3 muted = mix(vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), vColor, 0.6);
  vec3 grain = glassGrain(c, vPointSize * (1.0 - vBlur), muted, vGlint, vPhase);
  vec3 disc = muted * (1.0 - smoothstep(0.6, 1.0, r)) * 0.4;
  gl_FragColor = vec4(mix(grain, disc, smoothstep(0.5, 0.9, vBlur)), 1.0);
}
