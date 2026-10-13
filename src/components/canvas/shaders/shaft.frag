// A soft shaft of light falling from the surface: brightest at the top, fading with depth,
// soft at its sides, flickering slowly as the water above moves (noise.glsl prepended).

uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  float side = 1.0 - abs(vUv.x * 2.0 - 1.0);
  // Fades in just under the surface (no hard top edge), then fades with depth.
  float body = pow(side, 2.5) * pow(vUv.y, 1.6) * smoothstep(1.0, 0.82, vUv.y);
  float flicker = 0.6 + 0.4 * snoise(vec3(vUv.x * 2.0 + uSeed, vUv.y * 0.5, uTime * 0.25 + uSeed));
  gl_FragColor = vec4(uColor * body * flicker * uOpacity, 1.0);
}
