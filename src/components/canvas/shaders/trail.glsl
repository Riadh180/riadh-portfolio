// Cursor trail: a low-res 2D velocity field (uv units / second) that the cursor
// paints into. It self-advects and decays, so the wake keeps flowing like water.

uniform vec2 uPointer;
uniform vec2 uPointerVelocity;
uniform float uAspect;
uniform float uRadius;
uniform float uDecay;
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 velocity = texture2D(textureTrail, uv).xy;

  vec2 advected = texture2D(textureTrail, uv - velocity * uDelta * 0.5).xy * uDecay;

  vec2 d = uv - uPointer;
  d.x *= uAspect;
  float splat = exp(-dot(d, d) / uRadius);
  float moving = clamp(length(uPointerVelocity) * 8.0, 0.0, 1.0);

  gl_FragColor = vec4(mix(advected, uPointerVelocity, splat * moving), 0.0, 1.0);
}
