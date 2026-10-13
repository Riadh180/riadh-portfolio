// The light inside each skill gem: a soft glow, sized in world units, with depth of
// field: nodes far from the focus distance blur into faint bokeh discs.

uniform float uViewportHeight;
uniform float uTime;
uniform float uFocusDistance;
uniform float uAperture;

attribute float size;
attribute vec3 color;
/** 0..1: how lit the node is (focus). */
attribute float lit;

varying vec3 vColor;
varying float vLit;
varying float vBlur;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  float breathe = 1.0 + 0.08 * sin(uTime * 1.3 + position.x * 3.0);
  float focusSize = size * pixelsPerUnit * breathe * (1.0 + lit * 0.4);
  float coc = uAperture * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.012;
  float total = focusSize + coc;
  gl_PointSize = min(total, 64.0);
  vBlur = clamp(coc / total, 0.0, 1.0);
  // Energy conservation: a blurred node spreads the same light wider.
  float energy = clamp((focusSize * focusSize) / (total * total), 0.06, 1.0);
  vColor = color * energy;
  vLit = lit;
}
