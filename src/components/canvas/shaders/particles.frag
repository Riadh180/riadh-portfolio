varying vec3 vColor;
varying float vBlur;
varying float vPointSize;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);

  float aa = 2.0 / vPointSize;
  float disc = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (disc <= 0.0) discard;

  // In focus: fine grain with a hot core. Out of focus: a flat bokeh disc with a faint
  // brighter rim.
  float core = exp(-r * r * 9.0) * 1.4 + (1.0 - smoothstep(0.2, 1.0, r)) * 0.2;
  float bokeh = disc * mix(0.72, 1.0, smoothstep(0.55, 0.95, r));
  float shape = mix(core, bokeh, vBlur);

  gl_FragColor = vec4(vColor * shape, 1.0);
}
