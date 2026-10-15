// A glass panel passing right in front of the lens, far out of focus: a soft rounded
// rectangle, a faint milky fill and a blurred bright rim whose hue slides across it.
uniform vec3 uColors[3];
uniform float uOpacity;
uniform vec2 uSize;

varying vec2 vUv;

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  // Room inside the plane for the blur, so no straight plane edge ever shows.
  float d = roundedBox(p, uSize * 0.5 - 0.42, 0.12);
  float blur = 0.32;
  float fill = 1.0 - smoothstep(-blur, blur, d);
  float rim = exp(-abs(d) / 0.16);
  float t = vUv.x * 0.7 + vUv.y * 0.3;
  vec3 hue = t < 0.5 ? mix(uColors[0], uColors[1], t * 2.0) : mix(uColors[1], uColors[2], t * 2.0 - 1.0);
  vec3 color = hue * (fill * 0.03 + rim * 0.34) + vec3(1.0) * rim * 0.05;
  gl_FragColor = vec4(color * uOpacity, 1.0);
}
