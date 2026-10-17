// The backdrop behind an opened card (work/OpenBackdrop.tsx): a plane square to the camera,
// just behind the card. The fragment side works in screen space.
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
