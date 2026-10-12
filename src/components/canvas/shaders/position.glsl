// GPGPU position pass. w carries a per-particle random seed.

uniform float uDelta;
uniform vec3 uCenter;
uniform vec3 uBounds;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture2D(texturePosition, uv);
  vec3 velocity = texture2D(textureVelocity, uv).xyz;

  vec3 position = particle.xyz + velocity * uDelta;

  // Streams wrap horizontally so the field never empties out.
  float x = position.x - uCenter.x;
  position.x = mod(x + uBounds.x, 2.0 * uBounds.x) - uBounds.x + uCenter.x;

  gl_FragColor = vec4(position, particle.w);
}
