// The vertex side of the world's glass grains (see glassGrain.glsl): how the air answers the
// cursor, and how a grain catches the light. Shared uniforms (particles/CursorField.tsx),
// the same objects in every grain material, so the whole world moves in one voice. Imported
// through CursorField's `grainMotion`, with airPush.glsl prepended.

/** The air's flow field (full tier): rg = how far the air has moved, ba = its velocity (NDC). */
uniform sampler2D uCursorField;
/** 0 = off (reduced motion), 1 = the cursor's recent path (lite), 2 = the flow field (full). */
uniform float uCursorMode;
uniform float uCursorRadius;
/** The whole field shifts a little against the cursor (NDC), lagging like the camera. */
uniform vec2 uParallax;
/**
 * Lite: the cursor's recent path, a stretch every 0.1 s (from xy to zw, NDC) and each
 * stretch's life (x its age in s, zw the cursor's velocity, NDC / s), and a tap's ripple (xy,
 * z strength, w age). The air's spring (ω, ζ) and the place's strength.
 */
#define AIR_TRAIL 16
uniform vec4 uAirTrail[AIR_TRAIL];
uniform vec4 uAirTrailLife[AIR_TRAIL];
uniform vec4 uAirRipple;
uniform vec2 uAirSpring;
uniform float uAirStrength;
/** Areas the air never pushes grains into (NDC x0, y0, x1, y1): the card in focus, the text. */
#define AIR_CLEAR 5
uniform vec4 uKeepClear[AIR_CLEAR];
/** The place's light: direction it comes from (world), its colour. */
uniform vec3 uGrainLight;
uniform vec3 uGrainLightColor;
/** A band of light passing through the world (the column's sweep): y, strength, colour. */
uniform vec2 uGrainSweep;
uniform vec3 uGrainSweepColor;

/**
 * How much of a stretch of the cursor's path reaches the air at its start + `pa` (square
 * units): the falloff's integral along it, so a long path through a point gives 1 and the
 * stretches split it without overlap, whatever the cursor's speed. `off`: from the stretch to
 * the point.
 */
float airShare(vec2 pa, vec2 ba, float radius, out vec2 off) {
  float len = length(ba);
  vec2 dir = ba / max(len, 1e-5);
  float t = dot(pa, dir);
  off = pa - dir * clamp(t, 0.0, len);
  float d = pa.x * dir.y - pa.y * dir.x;
  // ½ (erf(t / r) − erf((t − len) / r)), erf ≈ tanh(1.2 x).
  return exp(-d * d / (radius * radius)) * 0.5 * (tanh(1.2 * t / radius) - tanh(1.2 * (t - len) / radius));
}

/**
 * Lite: how far the air at `ndc` has moved, from the cursor's recent path: each stretch drags
 * the air near it along (airPush.glsl), and the air answers as the flow field's does, a damped
 * spring's impulse response (it drifts on, then springs home). The field holds the air while a
 * slow cursor lingers and takes only part of a quick pass; `airLinger` stands in for both, so
 * the two tiers move the grains about as far. `aspect` scales NDC x to square units.
 */
float airLinger(float speed) {
  return min(3.0, 1.07 / max(speed, 0.05) + 0.52);
}

vec2 airTrail(vec2 ndc, vec2 aspect, out float stirred) {
  float omega = uAirSpring.x;
  float zeta = uAirSpring.y;
  float wd = omega * sqrt(1.0 - zeta * zeta);
  float r2 = uCursorRadius * uCursorRadius;
  vec2 d = vec2(0.0);
  stirred = 0.0;
  for (int i = 0; i < AIR_TRAIL; i++) {
    vec4 life = uAirTrailLife[i];
    if (life.x > 3.0) continue;
    vec2 off;
    float share = airShare((ndc - uAirTrail[i].xy) * aspect, (uAirTrail[i].zw - uAirTrail[i].xy) * aspect, uCursorRadius, off);
    if (share < 0.005) continue;
    vec2 velocity = life.zw * aspect;
    float envelope = exp(-zeta * omega * life.x);
    float linger = airLinger(length(velocity));
    d += airPush(velocity, off) * linger * share * envelope * sin(wd * life.x) / wd;
    stirred = max(stirred, exp(-dot(off, off) / r2) * envelope * min(1.0, length(velocity) * 2.0));
  }
  // A tap: a ring pushed outward.
  vec2 off = (ndc - uAirRipple.xy) * aspect;
  float dist = length(off);
  float ring = exp(-pow((dist - uCursorRadius * 0.45) / (uCursorRadius * 0.4), 2.0));
  float envelope = exp(-zeta * omega * uAirRipple.w);
  d += off / max(dist, 1e-4) * ring * uAirRipple.z * envelope * sin(wd * uAirRipple.w) / wd;
  stirred = max(stirred, ring * envelope * min(1.0, uAirRipple.z));
  return d / aspect * uAirStrength;
}

/**
 * Keeps the cursor's push out of the clear areas: a grain resting outside one never lands in
 * it (it slides along the edge instead), and one resting inside is left alone.
 */
vec2 airKeepClear(vec2 ndc, vec2 d) {
  for (int i = 0; i < AIR_CLEAR; i++) {
    vec4 r = uKeepClear[i];
    if (r.x > r.z) continue;
    if (ndc.x > r.x && ndc.x < r.z && ndc.y > r.y && ndc.y < r.w) return vec2(0.0);
    vec2 q = ndc + d;
    if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) {
      if (ndc.x <= r.x) d.x = r.x - ndc.x;
      else if (ndc.x >= r.z) d.x = r.z - ndc.x;
      else if (ndc.y <= r.y) d.y = r.y - ndc.y;
      else d.y = r.w - ndc.y;
    }
  }
  return d;
}

/**
 * 0..1: how far a grain (at this NDC) lies inside a clear area (the card in focus, the text):
 * grains fade there, so no cloud sits on a focused card's face or over the text.
 */
float grainClear(vec2 ndc) {
  float inside = 0.0;
  for (int i = 0; i < AIR_CLEAR; i++) {
    vec4 r = uKeepClear[i];
    if (r.x > r.z) continue;
    vec2 m = min(ndc - r.xy, r.zw - ndc);
    inside = max(inside, smoothstep(0.0, 0.05, min(m.x, m.y)));
  }
  return inside;
}

/**
 * Moves a grain (view space) with the air: carried along the cursor's path and curling round
 * it, drifting on, then springing home (the flow field on full, the cursor's recent path on
 * lite), never into the clear areas. Near grains move more than far ones (`focus` is the
 * depth of the subject). `stirred` (0..1): how much the air round the grain moves now.
 */
vec3 grainCursor(vec3 view, float focus, out float stirred) {
  stirred = 0.0;
  float depth = max(-view.z, 0.05);
  // Near grains (in front of the subject) move more than far ones.
  float near = clamp(focus / depth, 0.6, 1.8);
  vec2 shift = uParallax * near;
  if (uCursorMode > 0.5) {
    vec4 clip = projectionMatrix * vec4(view, 1.0);
    vec2 ndc = clip.xy / clip.w;
    vec2 d;
    if (uCursorMode > 1.5) {
      vec4 field = texture2D(uCursorField, clamp(ndc * 0.5 + 0.5, 0.0, 1.0));
      d = field.rg;
      stirred = clamp(length(field.ba) * 1.5, 0.0, 1.0);
    } else {
      vec2 aspect = vec2(projectionMatrix[1][1] / projectionMatrix[0][0], 1.0);
      d = airTrail(ndc, aspect, stirred);
    }
    shift += airKeepClear(ndc, d * near);
  }
  // NDC offset → view space at this depth.
  view.xy += shift * depth / vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
  return view;
}

/**
 * A stirred grain tumbles as the air carries it: its glint flickers on its own phase while
 * the air moves, so a swipe leaves a short shimmering trail.
 */
float grainStirred(float stirred, vec4 seed, float time) {
  return stirred * pow(0.5 + 0.5 * sin(time * (6.0 + seed.x * 7.0) + seed.w * 6.2831), 3.0);
}

/** 0..1: how much of a passing band of light (the column's sweep) reaches a grain. */
float grainSweep(vec3 world) {
  return exp(-pow((world.y - uGrainSweep.x) / 1.1, 2.0)) * uGrainSweep.y;
}

/**
 * 0..1: how squarely a tumbling grain faces the light now (its facet turns slowly, each
 * grain on its own axis and pace, so a cloud shimmers as grains pass through the light),
 * plus the light of a passing sweep band. `world` is the grain's world position.
 */
float grainGlint(vec3 world, vec4 seed, float time) {
  vec3 facet = normalize(vec3(
    sin(time * (0.3 + seed.x * 0.5) + seed.y * 6.28),
    sin(time * (0.23 + seed.z * 0.4) + seed.w * 6.28),
    cos(time * (0.27 + seed.w * 0.45) + seed.x * 6.28)));
  vec3 toEye = normalize(cameraPosition - world);
  vec3 halfway = normalize(normalize(uGrainLight) + toEye);
  float glint = pow(max(dot(facet, halfway), 0.0), 18.0);
  return clamp(glint + grainSweep(world) * 0.6, 0.0, 1.0);
}

/**
 * A bead's brightness tier from a random 0..1, the same split in every place: ~70% dim, ~25%
 * medium, ~5% bright (the reference's clouds: mostly dim, a few catching the light). The
 * multipliers keep the place's mean brightness about where it was.
 */
float grainTier(float r) {
  return r < 0.7 ? 0.42 : r < 0.95 ? 1.0 : 2.0;
}

/** Only the bright tier glints (the cursor still makes any bead it stirs catch the light). */
float grainGlints(float r) {
  return step(0.95, r);
}

/** A grain's colour, picking up the light that passes it: the sweep's hue for a moment. */
vec3 grainLit(vec3 color, vec3 world) {
  float sweep = grainSweep(world);
  float level = max(max(color.r, color.g), color.b);
  return mix(color, uGrainSweepColor * level * 1.3, sweep * 0.45);
}
