// An atmosphere grain: a glass grain (glassGrain.glsl), muted; out of focus a soft disc.
varying vec3 vColor;
varying float vAlpha;
varying float vPointSize;
varying float vSoft;
varying float vGlint;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  float r = length(c);
  if (r > 1.0) discard;
  vec3 muted = mix(vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), vColor, 0.55);
  vec3 grain = glassGrain(c, vPointSize * (1.0 - vSoft), muted, vGlint, vPhase);
  vec3 disc = muted * (1.0 - smoothstep(0.7, 1.0, r)) * 0.35;
  gl_FragColor = vec4(mix(grain, disc, smoothstep(0.4, 0.9, vSoft)) * vAlpha * 0.6, 1.0);
}
