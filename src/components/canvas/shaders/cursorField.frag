// The air's answer to the cursor: a low-res screen-space field of tiny damped springs
// (rg = displacement, ba = velocity, both in NDC). The cursor's path this frame kicks the
// springs it passes (pushed aside, a slight swirl, a little along its motion), scaled by its
// speed; each spring then settles back on the shared motion system's "air" spring (a tiny
// overshoot), so the grains part and drift home in about a second and a half, leaving a
// short trail behind the cursor.
uniform sampler2D uPrevious;
/** xy: the cursor now, zw: where it was last frame (NDC). */
uniform vec4 uCursor;
/** The cursor's velocity (NDC / s), already gated (0 while scrolling, over text, on a card). */
uniform vec2 uVelocity;
uniform float uDt;
uniform float uOmega;
uniform float uZeta;
uniform float uStrength;
uniform float uRadius;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec4 state = texture2D(uPrevious, vUv);
  vec2 d = state.rg;
  vec2 v = state.ba;
  vec2 p = vUv * 2.0 - 1.0;
  // Distance to the cursor's path this frame, in square units (x scaled by the aspect).
  vec2 scale = vec2(uAspect, 1.0);
  vec2 pa = (p - uCursor.zw) * scale;
  vec2 ba = (uCursor.xy - uCursor.zw) * scale;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  vec2 off = pa - ba * h;
  float dist = length(off);
  float fall = exp(-dist * dist / (uRadius * uRadius));
  vec2 dir = off / max(dist, 1e-4);
  // Swirl: round the cursor, turning the way it passes.
  float side = sign(ba.x * pa.y - ba.y * pa.x);
  vec2 swirl = vec2(-dir.y, dir.x) * side;
  vec2 velocity = uVelocity * scale;
  float speed = length(velocity);
  vec2 kick = (dir * 0.75 + swirl * 0.3) * speed + velocity * 0.3;
  v += kick / scale * fall * uStrength * uDt;
  // Each spring settles back (semi-implicit Euler: stable at any frame time used here).
  v += (-uOmega * uOmega * d - 2.0 * uZeta * uOmega * v) * uDt;
  d += v * uDt;
  gl_FragColor = vec4(d, v);
}
