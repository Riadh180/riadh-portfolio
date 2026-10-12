// Near-black space with two soft corner light bleeds; the center stays dark.

uniform vec3 uBackground;
uniform vec3 uLowerLeft;
uniform vec3 uUpperRight;
uniform float uStrength;
uniform float uAspect;

varying vec2 vUv;

float bleed(vec2 corner) {
  // Round in pixels, sized against the short side, in landscape and portrait alike.
  vec2 d = (vUv - corner) * vec2(max(uAspect, 1.0), max(1.0 / uAspect, 1.0));
  return exp(-dot(d, d) * 4.0);
}

void main() {
  vec3 color = uBackground;
  color += uLowerLeft * bleed(vec2(-0.08, -0.12)) * uStrength;
  color += uUpperRight * bleed(vec2(1.08, 1.12)) * uStrength * 0.8;
  gl_FragColor = vec4(color, 1.0);
}
