// A rising glass grain of one colour (glassGrain.glsl, bubble.vert with GRAIN): Contact's warm
// embers round The Core, Depth's few larger beads rising with the bubbles.
uniform vec3 uColor;
varying float vAlpha;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  if (length(c) > 1.0) discard;
  gl_FragColor = glassGrain(c, vPointSize, uColor * 1.6, vGlint, vPhase) * vAlpha;
}
