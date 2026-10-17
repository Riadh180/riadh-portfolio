// How the cursor drags the air, shared by the flow field (cursorField.frag, full tier) and the
// grains' lite trail (grainMotion.glsl): the air near its path takes on part of its motion,
// little of a slow move and more of a quick one (a nudge, a stir, a scatter), parting a little
// and swirling either side. Square units (NDC x scaled by the aspect); `off` points from the
// cursor's path to the air.
vec2 airPush(vec2 velocity, vec2 off) {
  float speed = length(velocity);
  float carry = 0.4 * speed / (speed + 1.2);
  vec2 dir = off / max(length(off), 1e-4);
  float side = sign(velocity.x * off.y - velocity.y * off.x);
  return carry * (velocity + (dir * 0.35 + vec2(-dir.y, dir.x) * side * 0.3) * speed);
}
