// An atmosphere mote: a soft disc, its rim a touch brighter, like bokeh from a lens.
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float disc = 1.0 - smoothstep(0.82, 1.0, d);
  float rim = 0.75 + 0.25 * smoothstep(0.55, 0.95, d);
  gl_FragColor = vec4(vColor * disc * rim * vAlpha, 1.0);
}
