// Dust motes that live in the world (the gold cloud, the slab): static positions with a
// slow drift, the same depth-of-field sprites as the ambient dust (particles.frag). With
// CLUMP defined (the slab), brightness follows the slab's baked smoke field.

uniform float uTime;
uniform float uSize;
uniform float uAperture;
uniform float uFocusDistance;
uniform float uViewportHeight;
uniform float uOpacity;
/** Largest sprite in pixels, and the depth where motes have faded into the dark. */
uniform float uMaxSize;
uniform float uFogFar;
/** Scales the cloud about its origin (a bloom outward). */
uniform vec3 uOrigin;
uniform float uExpand;
uniform float uDrift;
/** Hue ramp the motes cycle through; uCycle slides every mote along it. */
uniform vec3 uColors[3];
uniform float uCycle;
/** How far apart the motes sit on the ramp: 1 = every hue at once, small = one shared hue. */
uniform float uSpread;

#ifdef CLUMP
/** The slab's baked smoke field and the xz area it covers. */
uniform sampler2D uField;
uniform vec2 uFieldExtent;
uniform float uFieldCenterZ;
#endif

attribute vec4 seed;

varying vec3 vColor;
varying float vBlur;
varying float vPointSize;
#ifdef GRAIN
// The world's glass grain (grainMotion.glsl prepended): its glint and film phase.
varying float vGlint;
varying float vPhase;
#endif

vec3 ramp(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uColors[0], uColors[1], x);
  if (x < 2.0) return mix(uColors[1], uColors[2], x - 1.0);
  return mix(uColors[2], uColors[0], x - 2.0);
}

void main() {
  vec3 p = uOrigin + (position - uOrigin) * (1.0 + uExpand);
  float phase = seed.x * 6.2831;
  p += vec3(sin(uTime * 0.23 + phase), sin(uTime * 0.17 + phase * 1.7), cos(uTime * 0.19 + phase)) * uDrift;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
#ifdef GRAIN
  // The cursor parts the dust; a grain glints as it turns through the place's light.
  float stirred;
  mvPosition.xyz = grainCursor(mvPosition.xyz, uFocusDistance, stirred);
  vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
  vGlint = max(grainGlint(world, seed, uTime), stirred);
#ifdef CAUSTIC
  // Under the water: the caustic web's light passing over the grain makes it flare.
  float web = abs(sin(world.x * 1.7 + uTime * 0.5) + sin(world.z * 1.3 - uTime * 0.4)
    + sin((world.x + world.z) * 0.9 + uTime * 0.3)) / 3.0;
  vGlint = max(vGlint, pow(web, 4.0) * 1.4);
#endif
  vPhase = fract(seed.x * 3.1 + seed.w);
#endif
  gl_Position = projectionMatrix * mvPosition;

  float depth = max(-mvPosition.z, 0.05);
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  float focusSize = max(uSize * mix(0.4, 1.6, seed.z * seed.z) * pixelsPerUnit, 1.0);
  float coc = uAperture * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.012;
  float size = min(focusSize + coc, uMaxSize);
  vPointSize = size;
  vBlur = clamp(coc / size, 0.0, 1.0);
  float energy = clamp((focusSize * focusSize) / (size * size), 0.02, 1.0);
  gl_PointSize = size;

  vec3 color = ramp(seed.y * uSpread + uCycle);
  // A rare few sparkle bright enough to bloom.
  color *= seed.w > 0.95 ? 2.6 : 0.55;
  color *= 0.6 + 0.4 * sin(uTime * (0.5 + seed.z) + phase);
#ifdef CLUMP
  // Sparkles gather inside the slab's bright smoke and thin out in its dark gaps.
  vec2 fieldUv = vec2(position.x / uFieldExtent.x, (position.z - uFieldCenterZ) / uFieldExtent.y) + 0.5;
  float density = texture2D(uField, fieldUv).r;
  color *= mix(0.06, 1.9, density * density);
#endif
  float fog = smoothstep(uFogFar, uFogFar * 0.3, depth);
  vColor = color * uOpacity * energy * fog;
#ifdef GRAIN
  vColor = grainLit(vColor, world);
#endif
}
