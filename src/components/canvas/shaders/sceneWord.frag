// A place's display word, large in the world (the statement's tagline treatment, shared):
// drawn additively in the opaque pass, so glass in front bends it and solid things in
// front break it. Each line rises into its row (masked from below), staggered; now and
// then one line glitches (bands slip, letters double). With uRipple the type wavers as if
// seen through a water surface, with a caustic shimmer running through it.

uniform sampler2D uMap;
uniform float uLines;
uniform float uReveal;
uniform float uGlitchLine;
uniform float uGlitch;
uniform float uTime;
uniform float uRipple;
uniform float uOpacity;
uniform vec3 uColor;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  vec2 st = vUv;
  if (uRipple > 0.0) {
    // Two crossing swells, slow, like a surface seen from below.
    st.x += sin(st.y * 14.0 + uTime * 1.1) * 0.006 * uRipple + sin(st.y * 31.0 - uTime * 1.7) * 0.003 * uRipple;
    st.y += sin(st.x * 9.0 + uTime * 0.8) * 0.02 * uRipple;
  }

  float row = (1.0 - st.y) * uLines;
  float line = floor(row);
  // Lines rise one after another: each starts 15% of the reveal after the one above.
  float reveal = clamp(uReveal * (1.0 + 0.15 * (uLines - 1.0)) - line * 0.15, 0.0, 1.0);
  reveal = 1.0 - pow(1.0 - reveal, 3.0);
  float source = row - (1.0 - reveal);
  if (source < line || line >= uLines) discard;
  vec2 uv = vec2(st.x, 1.0 - source / uLines);

  float glitch = abs(line - uGlitchLine) < 0.5 ? uGlitch : 0.0;
  float cover;
  if (glitch > 0.0) {
    float band = floor(fract(row) * 9.0);
    float tick = floor(uTime * 24.0);
    float slip = (hash(band * 7.13 + tick) - 0.5) * 0.1;
    slip += step(0.72, hash(band * 3.7 + tick * 1.3)) * 0.08 * sign(hash(band + tick) - 0.5);
    uv.x += slip * glitch;
    cover = max(texture2D(uMap, uv).r, texture2D(uMap, uv + vec2(0.025 * glitch, 0.0)).r * 0.5 * glitch);
  } else {
    cover = texture2D(uMap, uv).r;
  }

  // Caustic shimmer: soft bright bands drifting through the letters.
  float shimmer = 1.0;
  if (uRipple > 0.0) {
    shimmer = 0.75 + 0.5 * pow(0.5 + 0.5 * sin(st.x * 23.0 + st.y * 11.0 - uTime * 1.3) * sin(st.x * 7.0 - st.y * 17.0 + uTime * 0.9), 2.0) * uRipple;
  }
  gl_FragColor = vec4(uColor * cover * shimmer * uOpacity, 1.0);
}
