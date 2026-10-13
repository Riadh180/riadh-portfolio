// A card's frosted glass breaking off into particles (noise.glsl and dissolve.glsl are prepended in TS). Each
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

void main() {
  float threshold = dissolveThreshold(spot, uSeed);
  // Seconds-ish since release; uDissolve runs 0 → 2 (1 = card gone, 2 = dust settled away).
  float life = max(0.0, uDissolve - threshold) * 1.4;

  vec3 p = vec3((spot - 0.5) * uSize, uFront);
  // Away from the face and slightly outward: the glass flakes off towards the viewer.
  vec3 outward = vec3((spot - 0.5) * vec2(1.2, 0.8), 0.9 + seed.x);
  vec3 swirl = vec3(
    snoise(vec3(spot * 3.0, seed.y * 5.0 + life * 0.6)),
    snoise(vec3(spot * 3.0 + 7.0, seed.z * 5.0 + life * 0.6)),
    snoise(vec3(spot * 3.0 - 4.0, seed.w * 5.0 + life * 0.6))
  );
  p += (outward * (0.35 + seed.y * 0.5) + swirl * 0.5) * life * (1.0 + life * 0.6);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float released = step(0.0001, life);
  vAlpha = released * smoothstep(1.2, 0.1, life) * 0.9;
  vColor = texture2D(uImage, spot).rgb * 1.5 + 0.08;
  // Fine: mostly tiny flakes, a few slightly larger.
  gl_PointSize = released * uPointScale * (0.35 + seed.z * seed.z * 1.1) / max(-mv.z, 0.1);
}
