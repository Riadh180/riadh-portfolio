// The vertex side of the world's glass grains (see glassGrain.glsl): how the air answers the
// cursor, and how a grain catches the light. Shared uniforms (particles/CursorField.tsx),
// the same objects in every grain material, so the whole world moves in one voice.

/** The cursor's spring field (full tier): rg = displacement, ba = velocity, in NDC. */
uniform sampler2D uCursorField;
/** 0 = off (reduced motion), 1 = stateless push (lite, phones), 2 = the field (full). */
uniform float uCursorMode;
/** Stateless push: the cursor (xy, NDC), how stirred the air is, and the radius (NDC y). */
uniform vec4 uCursor;
uniform float uCursorRadius;
/** The whole field shifts a little against the cursor (NDC), lagging like the camera. */
uniform vec2 uParallax;
/** The place's light: direction it comes from (world), its colour. */
uniform vec3 uGrainLight;
uniform vec3 uGrainLightColor;
/** A band of light passing through the world (the column's sweep): y, strength, colour. */
uniform vec2 uGrainSweep;
uniform vec3 uGrainSweepColor;

/**
 * Moves a grain (view space) with the cursor: pushed aside with a slight swirl, springing
 * back (the field) or easing back as the air settles (stateless). Near grains move more than
 * far ones (`focus` is the depth of the subject). `stirred` (0..1) brightens the glint of a
 * disturbed grain.
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
      vec2 off = (ndc - uCursor.xy) * aspect;
      float dist = length(off);
      float fall = exp(-dist * dist / (uCursorRadius * uCursorRadius));
      vec2 dir = off / max(dist, 1e-4);
      d = (dir * 0.85 + vec2(-dir.y, dir.x) * 0.3) * fall * uCursor.z * uCursorRadius * 0.6 / aspect;
      stirred = fall * uCursor.z;
    }
    shift += d * near;
  }
  // NDC offset → view space at this depth.
  view.xy += shift * depth / vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
  return view;
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

/** A grain's colour, picking up the light that passes it: the sweep's hue for a moment. */
vec3 grainLit(vec3 color, vec3 world) {
  float sweep = grainSweep(world);
  float level = max(max(color.r, color.g), color.b);
  return mix(color, uGrainSweepColor * level * 1.3, sweep * 0.45);
}
