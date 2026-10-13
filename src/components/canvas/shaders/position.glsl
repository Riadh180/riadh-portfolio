// GPGPU position pass. w carries a per-particle random seed.

uniform float uDelta;
uniform vec3 uCenter;
uniform vec3 uBounds;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture2D(texturePosition, uv);
  vec3 velocity = texture2D(textureVelocity, uv).xyz;

  vec3 position = particle.xyz + velocity * uDelta;

  // Streams wrap round the field so it never empties out: horizontally, and vertically as
  // the field's centre follows the camera down the path (the dust itself stays in place).
  vec2 xy = position.xy - uCenter.xy;
  position.xy = mod(xy + uBounds.xy, 2.0 * uBounds.xy) - uBounds.xy + uCenter.xy;

  gl_FragColor = vec4(position, particle.w);
}
