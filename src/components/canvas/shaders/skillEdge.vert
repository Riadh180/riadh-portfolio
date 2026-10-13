// Graph filaments: thin lines from a node to its parent, with signal pulses travelling
// outward from the core.

/** 0 at the parent end, 1 at the child end. */
attribute float along;
attribute vec3 color;
attribute float lit;
attribute float phase;

varying float vAlong;
varying vec3 vColor;
varying float vLit;
varying float vPhase;

void main() {
  vAlong = along;
  vColor = color;
  vLit = lit;
  vPhase = phase;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
