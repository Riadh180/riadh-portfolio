// Small round points (globe cities, orbiting dust): size in pixels at unit distance.
uniform float uSize;
uniform float uTime;
attribute vec4 seed;
varying float vTwinkle;
varying float vSeed;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + seed.x) / -mv.z;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (0.8 + seed.y * 2.0) + seed.z * 6.28);
  vSeed = seed.w;
}
