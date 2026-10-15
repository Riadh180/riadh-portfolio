// The card scene's backdrop: the world's own corner bleeds, small (accent lower left,
// cool upper right) over near-black.
uniform vec3 uBase;
uniform vec3 uLowerLeft;
uniform vec3 uUpperRight;
varying vec2 vUv;

void main() {
  float ll = 1.0 - smoothstep(0.0, 0.9, length(vUv - vec2(0.0, 0.0)));
  float ur = 1.0 - smoothstep(0.0, 0.9, length(vUv - vec2(1.0, 1.0)));
  gl_FragColor = vec4(uBase + uLowerLeft * ll * 0.55 + uUpperRight * ur * 0.4, 1.0);
}
