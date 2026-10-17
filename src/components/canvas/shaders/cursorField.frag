// The air's answer to the cursor, like dust in water: a screen-space flow field (rg = how far
// the air has moved, ba = its velocity; both NDC). The cursor writes its velocity into the
// air along its path (airPush.glsl, prepended): the air near it is dragged along, parted a
// little and swirls either side. The flow then carries itself on (advection) with a slight curl and slows down, and a
// soft spring brings the air home (the shared motion system's `air`): grains drift on for a
// moment after the cursor stops, then settle in about two seconds with a tiny overshoot. A
// tap pushes a small ring outward (a ripple).
uniform sampler2D uPrevious;
/** xy: the cursor now, zw: where it was last frame (NDC). */
uniform vec4 uCursor;
/** The cursor's velocity (NDC / s), already gated (0 while scrolling, over text, on a card). */
uniform vec2 uVelocity;
/** A tap this frame: xy (NDC), z its strength (0 = none). */
uniform vec3 uRipple;
uniform float uDt;
uniform float uTime;
uniform float uOmega;
uniform float uZeta;
/** How strongly the cursor drags the air (the place's strength and the device's included). */
uniform float uStrength;
uniform float uRadius;
uniform float uAspect;

varying vec2 vUv;

/**
 * How quickly the air near the path takes on the cursor's push (per second): softly, so much
 * of the push lands just after the cursor has passed (the air keeps drifting as it stops), and
 * how much more the field takes than one quick push (the lite trail's) to move as far.
 */
const float GRIP = 7.0;
const float GAIN = 1.35;
/** The slight curl of moving air (per second, relative to its own speed). */
const float CURL = 2.2;

/** A slowly changing, divergence-free swirl: the curl of ψ (square units). */
vec2 curl(vec2 p, float t) {
  float a = p.x * 3.1 + t * 0.4;
  float b = p.y * 2.7 - t * 0.3;
  float c = (p.x - p.y) * 4.3 + t * 0.5;
  float dx = 3.1 * cos(a) * cos(b) + 2.15 * cos(c);
  float dy = -2.7 * sin(a) * sin(b) - 2.15 * cos(c);
  return vec2(dy, -dx) / 6.0;
}

void main() {
  vec2 scale = vec2(uAspect, 1.0);
  // Advection: the air carries itself on (traced back along its own velocity).
  vec2 here = texture2D(uPrevious, vUv).ba;
  vec4 state = texture2D(uPrevious, vUv - here * uDt * 0.5);
  vec2 d = state.rg;
  vec2 v = state.ba;
  vec2 p = vUv * 2.0 - 1.0;

  // The cursor's path this frame, in square units (x scaled by the aspect).
  vec2 pa = (p - uCursor.zw) * scale;
  vec2 ba = (uCursor.xy - uCursor.zw) * scale;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  vec2 off = pa - ba * h;
  float dist = length(off);
  float fall = exp(-dist * dist / (uRadius * uRadius));
  vec2 velocity = uVelocity * scale;
  float speed = length(velocity);
  // Written only while the cursor moves (a resting cursor doesn't brake the air).
  vec2 target = airPush(velocity, off) * GAIN * uStrength;
  float grip = fall * smoothstep(0.02, 0.2, speed) * clamp(GRIP * uDt, 0.0, 1.0);
  vec2 sq = v * scale;
  sq += (target - sq) * grip;

  // A tap: a ring pushed outward round it.
  vec2 rp = (p - uRipple.xy) * scale;
  float rd = length(rp);
  sq += rp / max(rd, 1e-4) * exp(-pow((rd - uRadius * 0.45) / (uRadius * 0.4), 2.0)) * uRipple.z;

  // A slight curl where the air moves.
  sq += curl(p * scale, uTime) * length(sq) * CURL * uDt;
  v = sq / scale;

  // The spring home and the decay (semi-implicit Euler: stable at the frame times used here).
  v += (-uOmega * uOmega * d - 2.0 * uZeta * uOmega * v) * uDt;
  d += v * uDt;
  gl_FragColor = vec4(d, v);
}
