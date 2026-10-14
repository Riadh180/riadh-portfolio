// A route line: `along` runs 0..1 from start to end; `offset` staggers the pulses.
attribute float along;
attribute float offset;

varying float vAlong;
varying float vOffset;

void main() {
  vAlong = along;
  vOffset = offset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
