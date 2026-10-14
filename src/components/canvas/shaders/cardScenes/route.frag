// A dim route with a bright pulse travelling along it (shipments in transit).
uniform vec3 uColor;
uniform vec3 uPulse;
uniform float uTime;
uniform float uSpeed;

varying float vAlong;
varying float vOffset;

void main() {
  float head = fract(uTime * uSpeed + vOffset);
  float behind = head - vAlong;
  float pulse = behind >= 0.0 ? exp(-behind * 14.0) : 0.0;
  float fade = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.92, vAlong);
  gl_FragColor = vec4((uColor * 0.7 + uPulse * pulse * 2.6) * fade, 1.0);
}
