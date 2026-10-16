// The card scene's backdrop: near-black, with only a faint bleed of the subject's colours
// (accent lower left, cool upper right); the colour comes from the subject itself.
uniform vec3 uBase;
uniform vec3 uLowerLeft;
uniform vec3 uUpperRight;
varying vec2 vUv;

void main() {
  float ll = 1.0 - smoothstep(0.0, 0.9, length(vUv - vec2(0.0, 0.0)));
  float ur = 1.0 - smoothstep(0.0, 0.9, length(vUv - vec2(1.0, 1.0)));
  gl_FragColor = vec4(uBase + uLowerLeft * ll * 0.12 + uUpperRight * ur * 0.08, 1.0);
}
