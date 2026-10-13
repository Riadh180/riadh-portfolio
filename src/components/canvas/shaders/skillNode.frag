// A node's glow: a soft core (in focus) or a flat bokeh disc (out of focus).

varying vec3 vColor;
varying float vLit;
varying float vBlur;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float core = exp(-r * r * 7.0);
  float bokeh = (1.0 - smoothstep(0.85, 1.0, r)) * 0.35;
  float shape = mix(core, bokeh, vBlur);
  // Focus brightens the sharp glow, not the bokeh (a lit, blurred node would bloom out).
  gl_FragColor = vec4(vColor * shape * (0.9 + vLit * 1.6 * (1.0 - vBlur)), 1.0);
}
