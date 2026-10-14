// Bakes a card's cast-glass relief once (noise.glsl is prepended in TS): the image shift
// per pixel (fragments + ripples + crinkle), the ripple value and the swell, packed into
// a half-float texture that frost.frag reads with a single lookup.
uniform float uSeed;
varying vec2 vUv;

float cellHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453);
}

void main() {
  vec2 p = vUv * vec2(2.6, 1.6) + uSeed * 7.0;
  vec2 slant = vec2(vUv.x * 0.8 + vUv.y * 0.35, vUv.y);
  float ripple = snoise(vec3(slant * vec2(9.0, 2.2) + uSeed, uSeed));
  float swell = snoise(vec3(p, uSeed + 3.0));

  vec2 warp = vec2(snoise(vec3(p * 2.2, 5.0)), snoise(vec3(p * 2.2, 8.0))) * 0.9;
  warp += vec2(snoise(vec3(p * 7.0, 2.0)), snoise(vec3(p * 7.0, 6.0))) * 0.35;
  vec2 cell = floor(vUv * vec2(20.0, 13.0) + warp);
  vec2 shard = vec2(cellHash(cell), cellHash(cell + 19.3)) - 0.5;
  vec2 crinkle = vec2(snoise(vec3(vUv * vec2(26.0, 18.0), uSeed + 1.0)), snoise(vec3(vUv * vec2(26.0, 18.0), uSeed + 4.0)));

  vec2 shift = vec2(ripple * 0.6, swell * 0.4) * 0.022 + shard * 0.03 + crinkle * 0.006;
  gl_FragColor = vec4(shift, ripple, swell);
}
