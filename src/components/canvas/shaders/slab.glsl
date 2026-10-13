// Smoke density of the dust slab, 0..1, at a point on its underside (local xz). Baked into
// a texture by slabField.frag, which the smoke layers and the slab's dust both read, so the
// sparkles gather inside the bright smoke and thin out in the dark gaps. Needs noise.glsl.
float slabDensity(vec2 p, float t) {
  vec2 q = p * 0.2;
  vec2 warp = q + 0.55 * vec2(snoise(vec3(q * 0.7, t)), snoise(vec3(q * 0.7 + 5.2, t + 2.1)));
  float n = snoise(vec3(warp, t * 0.6)) * 0.6
    + snoise(vec3(warp * 2.4 + 3.0, t)) * 0.3
    + snoise(vec3(warp * 5.0 - 1.7, t * 1.3)) * 0.1;
  return smoothstep(-0.2, 0.7, n);
}
