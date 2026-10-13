// When each spot of a card dissolves, 0..1 over the card's uv (noise.glsl must come first).
// The card's surface (frost.frag) disappears where uDissolve passes this threshold, and a
// particle is released from that same spot at that same moment (cardDust.vert).
float dissolveThreshold(vec2 uv, float seed) {
  float n = snoise(vec3(uv * vec2(4.0, 2.5), seed + 11.0)) * 0.7
    + snoise(vec3(uv * vec2(11.0, 7.0), seed + 3.0)) * 0.3;
  // A slight sweep from the left, so it reads as a wave, not static.
  return clamp(0.5 + 0.45 * n * 0.8 + (uv.x - 0.5) * 0.35, 0.02, 0.98);
}
