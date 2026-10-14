// The reveal: dust scattered in the dark condenses onto The Core's outline, flares as it
// arrives, and fades as the glass resolves in its place.
uniform float uProgress;
uniform float uSize;
uniform float uViewportHeight;

attribute vec3 target;
attribute vec4 seed;

varying float vAlpha;
varying float vSeed;

void main() {
  // Each mote on its own slightly offset clock.
  float t = clamp((uProgress - seed.x * 0.25) / 0.75, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 3.0);
  vec3 swirl = vec3(sin(seed.y * 6.28 + t * 4.0), cos(seed.z * 6.28 + t * 3.0), sin(seed.w * 6.28)) * (1.0 - e) * 0.8;
  vec3 p = mix(position, target, e) + swirl;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uViewportHeight * (0.6 + seed.w) / -mv.z;
  vAlpha = smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.85, 1.0, uProgress)) * (0.6 + e * 0.8);
  vSeed = seed.w;
}
