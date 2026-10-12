// Particle sprite. `position.xy` is this particle's texel in the simulation textures.

uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform float uSize;
uniform float uAperture;
uniform float uFocusDistance;
uniform float uViewportHeight;
uniform float uBrightness;
uniform vec3 uCenter;
uniform vec3 uBounds;
uniform vec3 uLightPositions[3];
uniform vec3 uLightColors[3];
uniform vec3 uGlowColor;

attribute vec4 seed;

varying vec3 vColor;
varying float vBlur;
varying float vPointSize;

void main() {
  vec3 worldPosition = texture2D(uPositions, position.xy).xyz;
  float speed = length(texture2D(uVelocities, position.xy).xyz);

  vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Depth of field: the circle of confusion grows with distance from the focus plane.
  float depth = -mvPosition.z;
  float pixelsPerUnit = projectionMatrix[1][1] * 0.5 * uViewportHeight / depth;
  float focusSize = max(uSize * mix(0.5, 1.8, seed.x * seed.x) * pixelsPerUnit, 1.0);
  float coc = uAperture * abs(depth - uFocusDistance) / depth * uViewportHeight * 0.012;
  float size = min(focusSize + coc, 64.0);

  vPointSize = size;
  vBlur = clamp(coc / size, 0.0, 1.0);
  // Energy conservation: a defocused particle spreads the same light over a larger disc.
  float energy = clamp((focusSize * focusSize) / (size * size), 0.025, 1.0);
  gl_PointSize = size;

  // Low-key lighting: particles are lit by nearby colored lights, not by a flat fill.
  vec3 light = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec3 toLight = uLightPositions[i] - worldPosition;
    light += uLightColors[i] / (1.0 + dot(toLight, toLight) * 0.07);
  }
  vec3 color = light * 0.9;

  // A few bright cores feed the bloom; fast particles (the cursor wake) glow.
  float spark = step(0.986, seed.y);
  color = mix(color, uGlowColor * 3.2, spark);
  color += uGlowColor * smoothstep(0.8, 3.5, speed) * 1.6;

  // Atmosphere: far particles sink into the dark, wrap edges fade out.
  float fog = smoothstep(28.0, 9.0, depth);
  float edge = smoothstep(uBounds.x, uBounds.x - 2.5, abs(worldPosition.x - uCenter.x));

  vColor = color * uBrightness * energy * fog * edge * (0.45 + seed.w * 0.55);
}
