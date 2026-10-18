// An atmosphere grain: a glass grain (glassGrain.glsl), muted; out of focus a bokeh disc.
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
  vec4 grain = glassGrain(c, vPointSize * (1.0 - vSoft), muted, vGlint, vPhase);
  float soft = smoothstep(0.4, 0.9, vSoft);
  float fade = vAlpha * 0.6;
  gl_FragColor = vec4(mix(grain.rgb, grainBokeh(c, muted), soft), grain.a * (1.0 - soft)) * fade;
}
