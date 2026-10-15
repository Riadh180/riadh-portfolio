// An ember: a small warm point with a soft glow.
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(uColor * vAlpha * exp(-d * d * 4.0) * 1.4, 1.0);
}
