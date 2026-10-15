// Near-black space with two soft corner light bleeds; the center stays dark.

uniform vec3 uBackground;
uniform vec3 uLowerLeft;
uniform vec3 uUpperRight;
uniform float uStrength;
uniform float uAspect;
/** Slow volumetric fog (0 = none; Work): drifting layers of darker and lighter haze. */
uniform float uFog;
uniform float uTime;
uniform vec3 uFogColor;
/** Fog detail (octaves: 4 full, 2 lite) and the backlight haze behind the column. */
uniform int uOctaves;
uniform vec3 uBacklight;
/** Work: a soft violet bleed off the upper-right corner, drifting slowly (~8s). */
uniform float uViolet;
uniform vec3 uVioletColor;

varying vec2 vUv;

float bleed(vec2 corner) {
  // Round in pixels, sized against the short side, in landscape and portrait alike.
  vec2 d = (vUv - corner) * vec2(max(uAspect, 1.0), max(1.0 / uAspect, 1.0));
  return exp(-dot(d, d) * 4.0);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + 1.0), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i >= uOctaves) break;
    v += noise2(p) * a;
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 color = uBackground;
  if (uFog > 0.0) {
    // Two layers drifting at different speeds: depth in the dark, never a flat field.
    vec2 p = vUv * vec2(uAspect, 1.0) * 2.2;
    float near = fbm(p + vec2(uTime * 0.012, uTime * 0.006));
    float far = fbm(p * 0.55 - vec2(uTime * 0.005, 0.0) + 7.0);
    float fog = smoothstep(0.35, 0.85, near) * 0.6 + smoothstep(0.4, 0.8, far) * 0.4;
    // Three depth layers: charcoal / teal / violet haze, darker towards the edges.
    vec3 haze = mix(uFogColor, uFogColor.bgr * 0.9, smoothstep(0.3, 0.8, far));
    float edge = smoothstep(0.95, 0.35, length((vUv - 0.5) * vec2(1.2, 1.0)));
    color = mix(color * 0.75, color + haze * 0.9, fog * uFog * (0.5 + 0.5 * edge));
    // Backlight: a soft lighter haze behind the column (centre of frame).
    vec2 b = (vUv - vec2(0.5, 0.55)) * vec2(uAspect * 1.6, 0.9);
    color += uBacklight * exp(-dot(b, b) * 3.0) * uFog;
  }
  color += uLowerLeft * bleed(vec2(-0.08, -0.12)) * uStrength;
  color += uUpperRight * bleed(vec2(1.08, 1.12)) * uStrength * 0.8;
  if (uViolet > 0.0) {
    vec2 corner = vec2(1.25 + sin(uTime * 0.785) * 0.06, 0.95 + cos(uTime * 0.6) * 0.08);
    vec2 d = (vUv - corner) * vec2(max(uAspect, 1.0), 1.0);
    color += uVioletColor * exp(-dot(d, d) * 3.2) * uViolet;
  }
  gl_FragColor = vec4(color, 1.0);
}
