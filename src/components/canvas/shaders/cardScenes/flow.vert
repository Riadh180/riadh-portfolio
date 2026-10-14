// Campaign data: each point flows from a scattered source on the left into the top of its
// bar, on its own clock, then starts again.
uniform float uTime;
uniform float uSize;
uniform vec3 uColors[3];
uniform float uTops[8];

attribute vec4 seed;
attribute float bar;
attribute vec3 source;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float t = fract(uTime * (0.12 + seed.x * 0.1) + seed.y);
  int index = int(bar);
  float top = uTops[0];
  for (int i = 0; i < 8; i++) if (i == index) top = uTops[i];
  vec3 target = vec3(position.x, top + 0.04, position.z);
  // A soft arc: out from the source, over, and down into the bar.
  vec3 p = mix(source, target, t * t * (3.0 - 2.0 * t));
  p.y += sin(t * 3.14159) * (0.3 + seed.z * 0.3);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + seed.w) / -mv.z;
  float k = seed.w * 3.0;
  vColor = k < 1.0 ? uColors[0] : k < 2.0 ? uColors[1] : uColors[2];
  vAlpha = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.85, t);
}
