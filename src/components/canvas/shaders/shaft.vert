// A light shaft from the surface: its lower end sways slowly, like light through moving
// water (uTime from the shaft uniforms; uv.y = 1 at the surface).
uniform float uTime;
uniform float uSeed;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  float sway = sin(uTime * 0.35 + uSeed * 6.28) * 0.35 + sin(uTime * 0.21 + uSeed * 2.0) * 0.2;
  p.x += sway * (1.0 - uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
