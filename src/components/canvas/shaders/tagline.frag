// The statement tagline, drawn additively in the opaque pass so the glass's transmission
// sees it and bends it. Each line rises into its own row (masked from below); one line at
// a time can glitch: bands slip sideways, letters double and ghost, colour fringes.

uniform sampler2D uMap;
uniform float uReveal[3];
uniform float uGlitchLine;
uniform float uGlitch;
uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;

const float LINES = 3.0;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float coverage(vec2 uv) {
  return texture2D(uMap, uv).r;
}

void main() {
  float row = (1.0 - vUv.y) * LINES;
  float line = floor(row);
  float reveal = line < 0.5 ? uReveal[0] : line < 1.5 ? uReveal[1] : uReveal[2];

  // Rise: the line's glyphs sit lower by what is left to reveal, masked by their row, so
  // they come up from below the line's baseline.
  float source = row - (1.0 - reveal);
  if (source < line) discard;
  vec2 uv = vec2(vUv.x, 1.0 - source / LINES);

  float glitch = abs(line - uGlitchLine) < 0.5 ? uGlitch : 0.0;
  vec3 cover;
  if (glitch > 0.0) {
    // Horizontal bands slip by different amounts, re-rolled ~24 times a second.
    float band = floor(fract(row) * 9.0);
    float tick = floor(uTime * 24.0);
    float slip = (hash(band * 7.13 + tick) - 0.5) * 0.12;
    slip += step(0.72, hash(band * 3.7 + tick * 1.3)) * 0.1 * sign(hash(band + tick) - 0.5);
    uv.x += slip * glitch;

    float core = max(coverage(uv), coverage(uv + vec2(0.03 * glitch, 0.0)) * 0.55 * glitch);
    float red = coverage(uv + vec2(0.01 * glitch, 0.0));
    float blue = coverage(uv - vec2(0.01 * glitch, 0.0));
    cover = vec3(max(core, red), core, max(core, blue));
  } else {
    cover = vec3(coverage(uv));
  }

  gl_FragColor = vec4(uColor * cover, 1.0);
}
