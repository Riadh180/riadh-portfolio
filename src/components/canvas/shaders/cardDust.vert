// A card's frosted glass breaking off into particles (noise.glsl, dissolve.glsl and grainMotion.glsl are prepended in TS). Each
// particle sits on a spot of the card's face, takes that spot's colour from the card's
// image, and is released when the dissolve front passes it (same threshold as frost.frag).
// Released particles drift outward and towards the viewer on a curling path, then fade.
// Run uDissolve backwards and they fly back and re-form the card.

uniform sampler2D uImage;
uniform float uDissolve;
uniform float uSeed;
uniform vec2 uSize;
uniform float uFront;
uniform float uPointScale;

/** Where on the card's face (0..1). */
attribute vec2 spot;
attribute vec4 seed;

varying vec3 vColor;
varying float vAlpha;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  float threshold = dissolveThreshold(spot, uSeed);
  // Seconds-ish since release; uDissolve runs 0 → 2 (1 = card gone, 2 = dust settled away).
  float life = max(0.0, uDissolve - threshold) * 1.4;

  vec3 p = vec3((spot - 0.5) * uSize, uFront);
  // Away from the face, outward and drifting off to the left (towards the details), as in the
  // reference's dissolve: a stream of image-coloured chips, not a puff towards the viewer.
  vec3 outward = vec3((spot - 0.5) * vec2(1.5, 0.9) + vec2(-0.55, 0.0), 0.45 + seed.x * 0.6);
  vec3 swirl = vec3(
    snoise(vec3(spot * 3.0, seed.y * 5.0 + life * 0.6)),
    snoise(vec3(spot * 3.0 + 7.0, seed.z * 5.0 + life * 0.6)),
    snoise(vec3(spot * 3.0 - 4.0, seed.w * 5.0 + life * 0.6))
  );
  p += (outward * (0.35 + seed.y * 0.5) + swirl * 0.5) * life * (1.0 + life * 0.6);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float released = step(0.0001, life);
  vAlpha = released * smoothstep(1.5, 0.15, life);
  // The world's brightness tiers (grainMotion.glsl), the mean kept.
  float tier = fract(seed.z * 5.1 + seed.y * 2.3);
  vColor = (texture2D(uImage, spot).rgb * 1.5 + 0.08) * grainTier(tier) / 0.644;
  // Beads of a few pixels, a few larger: the world's glass grains (glassGrain.glsl), each
  // turning as it drifts, so the bright ones flare now and then.
  gl_PointSize = released * uPointScale * (0.7 + seed.z * seed.z * 1.6) / max(-mv.z, 0.1);
  vPointSize = gl_PointSize;
  vGlint = pow(0.5 + 0.5 * sin(life * (4.0 + seed.x * 5.0) + seed.w * 6.2831), 12.0) * grainGlints(tier);
  vPhase = fract(seed.y * 3.3 + seed.z);
}
