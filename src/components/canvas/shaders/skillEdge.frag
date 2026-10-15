uniform float uTime;

varying float vAlong;
varying vec3 vColor;
varying float vLit;
varying float vPhase;

void main() {
  // A pulse runs outward along the line every couple of seconds; faster when lit.
  float head = fract(uTime * (0.45 + vLit * 0.5) + vPhase);
  float pulse = exp(-pow((vAlong - head) * 9.0, 2.0));
  float base = 0.16 + vLit * 0.5;
  gl_FragColor = vec4(vColor * (base + pulse * (0.9 + vLit * 1.5)), 1.0);
}
