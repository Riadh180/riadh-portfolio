// Skill graph nodes: glowing points, sized in world units (core > branch > skill).

uniform float uViewportHeight;
uniform float uTime;

attribute float size;
attribute vec3 color;
/** 0..1: how lit the node is (focus). */
attribute float lit;

varying vec3 vColor;
varying float vLit;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / -mv.z;
  float breathe = 1.0 + 0.06 * sin(uTime * 1.3 + position.x * 3.0);
  gl_PointSize = size * pixelsPerUnit * breathe * (1.0 + lit * 0.35);
  vColor = color;
  vLit = lit;
}
