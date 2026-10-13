// When each spot of a card's frosted glass clears, 0..1 over the card's uv (noise.glsl
// must come first): from the edges inward, with a fine, grainy front (no big blobs). The
// frost clears there (frost.frag) and a particle of glass breaks off from that spot at that
// moment (cardDust.vert).
float dissolveThreshold(vec2 uv, float seed) {
  vec2 edge = min(uv, 1.0 - uv) * vec2(1.0, 1.6);
  float inward = min(edge.x, edge.y) * 2.0;
  float grain = snoise(vec3(uv * vec2(46.0, 30.0), seed)) * 0.06
    + snoise(vec3(uv * vec2(9.0, 6.0), seed + 5.0)) * 0.05;
  return clamp(inward * 0.85 + grain + 0.04, 0.0, 1.0);
}
