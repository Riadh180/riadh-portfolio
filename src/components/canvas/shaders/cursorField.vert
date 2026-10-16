// Full-screen pass for the cursor field (particles/CursorField.tsx).
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
