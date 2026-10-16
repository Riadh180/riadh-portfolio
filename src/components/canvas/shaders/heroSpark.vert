// The hero's sparks: a few gold and pink points rising slowly past The Core, each on its own
// long loop, swaying a little, fading in at the bottom and out near the top.
uniform float uTime;
uniform float uHeight;
uniform float uSize;
uniform vec3 uGold;
uniform vec3 uPink;

/** speed, hue pick, phase, size pick. */
attribute vec4 seed;

varying vec3 vColor;

void main() {
  vec3 p = position;
  float y = mod(p.y + uTime * (0.07 + seed.x * 0.08), uHeight);
  float rise = y / uHeight;
  p.y = y - uHeight * 0.5;
  float phase = seed.z * 6.2831;
  p.x += sin(uTime * 0.21 + phase) * 0.18;
  p.z += cos(uTime * 0.17 + phase) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + seed.w * 0.8) / -mv.z;
  // A slow twinkle (each on its own period) on a fade in and out over the rise.
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.9 + seed.w * 1.3) + phase);
  float life = smoothstep(0.0, 0.2, rise) * (1.0 - smoothstep(0.65, 1.0, rise));
  vColor = mix(uGold, uPink, step(0.6, seed.y)) * life * twinkle;
}
