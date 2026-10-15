// The tagline breaking into dust as the camera leaves the statement: each point sits on a
// letter (sampled from the tagline's own texture), is released when its line dissolves
// (top line first, as in tagline.frag) and falls with the camera, drifting apart, then
// fades as it reaches the descent's dust.
uniform float uExit;
uniform float uFall;
uniform float uSize;

/** Which line (0 top) the point belongs to. */
attribute float row;
attribute vec3 seed;

varying float vAlpha;

void main() {
  float release = clamp((uExit * 1.6 - row * 0.3 - seed.x * 0.2) / 0.6, 0.0, 1.0);
  float fall = release * release;
  vec3 p = position;
  p.y -= fall * uFall * (0.75 + seed.y * 0.5);
  p.x += (seed.z - 0.5) * fall * 1.4;
  p.z += (seed.y - 0.5) * fall * 1.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + seed.z) / -mv.z;
  vAlpha = step(0.001, release) * (1.0 - smoothstep(0.6, 1.0, release));
}
