// Things rising through a place: Depth's bubbles, Contact's embers, Depth's glass beads. Each
// loops up through a tall box, wobbling as it goes. With GRAIN (grainMotion.glsl prepended)
// they are the world's glass grains: the cursor parts them, they glint as they turn through
// the place's light, and they fade where the HTML text sits (uTextZone, clip space).
uniform float uTime;
uniform float uHeight;
uniform float uSize;

attribute vec4 seed;
varying float vAlpha;
#ifdef GRAIN
uniform vec2 uTextZone;
varying float vPointSize;
varying float vGlint;
varying float vPhase;
#endif

void main() {
  vec3 p = position;
  float y = mod(p.y + uTime * (0.25 + seed.x * 0.35), uHeight);
  p.y = y - uHeight * 0.5;
  p.x += sin(uTime * (0.8 + seed.y) + seed.z * 6.28) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
#ifdef GRAIN
  float stirred;
  mv.xyz = grainCursor(mv.xyz, 7.0, stirred);
  vec3 world = (modelMatrix * vec4(p, 1.0)).xyz;
  // Brightness tiers (grainMotion.glsl): only the bright beads glint, unless the cursor stirs them.
  float tier = fract(seed.x * 7.31 + seed.z * 3.17);
  vGlint = max(grainGlint(world, seed, uTime) * grainGlints(tier), grainStirred(stirred, seed, uTime));
  vPhase = fract(seed.w * 5.3 + seed.y);
#endif
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + seed.w) / -mv.z;
  vAlpha = smoothstep(0.0, 0.15, y / uHeight) * (1.0 - smoothstep(0.8, 1.0, y / uHeight));
#ifdef GRAIN
  vAlpha *= grainTier(tier) / 0.644;
  vPointSize = gl_PointSize;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float text = (1.0 - smoothstep(uTextZone.x - 0.2, uTextZone.x, ndc.y)) * step(ndc.x, uTextZone.y);
  vAlpha *= 1.0 - text * 0.85;
#endif
}
