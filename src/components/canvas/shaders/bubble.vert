// Bubbles rising in Depth: each loops up through a tall box, wobbling as it goes.
uniform float uTime;
uniform float uHeight;
uniform float uSize;

attribute vec4 seed;
varying float vAlpha;

void main() {
  vec3 p = position;
  float y = mod(p.y + uTime * (0.25 + seed.x * 0.35), uHeight);
  p.y = y - uHeight * 0.5;
  p.x += sin(uTime * (0.8 + seed.y) + seed.z * 6.28) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + seed.w) / -mv.z;
  vAlpha = smoothstep(0.0, 0.15, y / uHeight) * (1.0 - smoothstep(0.8, 1.0, y / uHeight));
}
