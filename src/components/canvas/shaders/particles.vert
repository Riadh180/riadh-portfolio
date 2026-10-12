// Particle sprite. `position.xy` is this particle's texel in the simulation textures.

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uTime;
uniform float uSize;
uniform float uAperture;
uniform float uFocusDistance;
uniform float uViewportHeight;
uniform float uBrightness;
uniform vec3 uCenter;
uniform vec3 uBounds;
// teal, blue, violet, emerald, warm (gold), glow
uniform vec3 uPalette[6];

attribute vec4 seed;

varying vec3 vColor;
varying float vBlur;
varying float vPointSize;

vec3 dustColor(float pick) {
  // Mostly cool hues, with rare emerald and gold sparks.
  if (pick < 0.32) return uPalette[0];
  if (pick < 0.56) return uPalette[1];
  if (pick < 0.80) return uPalette[2];
  if (pick < 0.90) return uPalette[3];
  if (pick < 0.97) return uPalette[4];
  return uPalette[5];
}

void main() {
  vec3 worldPosition = texture2D(uPositions, position.xy).xyz;
  float speed = length(texture2D(uVelocities, position.xy).xyz);

  vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Depth of field: the circle of confusion grows with distance from the focus plane.
  float depth = -mvPosition.z;
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  float focusSize = max(uSize * mix(0.4, 1.6, seed.x * seed.x * seed.x) * pixelsPerUnit, 1.0);
  float coc = uAperture * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.012;
  float size = min(focusSize + coc, 56.0);

  vPointSize = size;
  vBlur = clamp(coc / size, 0.0, 1.0);
  // Energy conservation: a defocused particle spreads the same light over a larger disc.
  float energy = clamp((focusSize * focusSize) / (size * size), 0.02, 1.0);
  gl_PointSize = size;

  vec3 color = dustColor(seed.y);
  // A rare few are bright enough to bloom; the rest stay quiet.
  color *= seed.w > 0.97 ? 3.0 : 0.4;
  // Slow twinkle, and particles moved by the cursor or a dissolve catch the light.
  color *= 0.65 + 0.35 * sin(uTime * (0.4 + seed.z) + seed.x * 6.2831);
  color += uPalette[5] * smoothstep(0.8, 3.5, speed) * 1.2;

  // Atmosphere: far particles sink into the dark, wrap edges fade out.
  float fog = smoothstep(28.0, 8.0, depth);
  float edge = smoothstep(uBounds.x, uBounds.x - 2.5, abs(worldPosition.x - uCenter.x));

  vColor = color * uBrightness * energy * fog * edge;
}
