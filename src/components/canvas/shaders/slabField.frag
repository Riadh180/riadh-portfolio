// Bakes the slab's smoke into a small texture each frame (noise.glsl and slab.glsl are
// prepended in TS): R = cloud density, G = thin bright wisps. The smoke layers and the
// slab's dust read it instead of evaluating the noise per screen pixel.

uniform float uTime;
uniform vec2 uExtent;
uniform float uCenterZ;

varying vec2 vUv;

void main() {
  vec2 xz = vec2((vUv.x - 0.5) * uExtent.x, (vUv.y - 0.5) * uExtent.y + uCenterZ);
  float t = uTime * 0.02;
  float density = slabDensity(xz, t);
  float wisp = pow(1.0 - abs(snoise(vec3(xz * 0.35, t * 1.5 + 9.0))), 12.0) * density;
  gl_FragColor = vec4(density, wisp, 0.0, 1.0);
}
