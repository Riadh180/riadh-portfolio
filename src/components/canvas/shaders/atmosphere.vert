// The world's atmosphere layers: motes wrapped in a box that travels with the camera, so
// every frame has them, yet each one is anchored in the world (the camera moves past them,
// with parallax). One shader, two layers: the foreground (a few large out-of-focus discs
// close to the lens) and the background (many tiny distant motes, fading into the haze).

uniform float uTime;
/** Side of the wrapping box (world units), and the depth band a layer is visible in. */
uniform float uBox;
uniform float uNear;
uniform float uFar;
/** World size of a mote, depth-of-field strength and focus distance (the subject). */
uniform float uSize;
uniform float uAperture;
uniform float uFocus;
uniform float uMaxSize;
uniform float uViewportHeight;
uniform float uOpacity;
uniform float uDrift;
/** Hue ramp (palette), pulled towards the place's accent. */
uniform vec3 uColors[4];
uniform vec3 uAccent;
uniform float uAccentAmount;
/** Where the HTML text lives (clip space): x below .x (desktop, left column), y below .y (phones). */
uniform vec2 uTextZone;

attribute vec4 seed;

varying vec3 vColor;
varying float vAlpha;
varying float vPointSize;
varying float vSoft;
varying float vGlint;
varying float vPhase;

vec3 ramp(float t) {
  float x = fract(t) * 4.0;
  if (x < 1.0) return mix(uColors[0], uColors[1], x);
  if (x < 2.0) return mix(uColors[1], uColors[2], x - 1.0);
  if (x < 3.0) return mix(uColors[2], uColors[3], x - 2.0);
  return mix(uColors[3], uColors[0], x - 3.0);
}

void main() {
  float phase = seed.w * 6.2831;
  // A slow rise with a lazy sideways sway: never still.
  vec3 drift = vec3(sin(uTime * 0.05 + phase) * 0.8, uTime * 0.05, cos(uTime * 0.04 + phase * 1.3) * 0.6) * uDrift;
  vec3 p = mod(seed.xyz * uBox + drift - cameraPosition, uBox) - uBox * 0.5 + cameraPosition;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  float stirred;
  mv.xyz = grainCursor(mv.xyz, uFocus, stirred);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float fade = smoothstep(uNear, uNear * 1.6, depth) * (1.0 - smoothstep(uFar * 0.65, uFar, depth));

  // Circle of confusion: the further from the focus, the bigger and dimmer the disc.
  float sharp = uSize * uViewportHeight / max(depth, 0.1);
  float blur = abs(depth - uFocus) / max(depth, 0.1) * uAperture * uViewportHeight * 0.02;
  float size = min(sharp + blur, uMaxSize);
  gl_PointSize = fade > 0.001 ? size : 0.0;
  vPointSize = size;
  // The light of a mote spreads over its disc.
  float spread = clamp(sharp / max(size, 0.001), 0.0, 1.0);
  vSoft = 1.0 - spread;
  vPhase = fract(seed.x * 3.1 + seed.z);
  // Brightness tiers (mostly dim, a few bright: grainMotion.glsl), the layer's mean kept;
  // only the bright beads glint.
  float tier = fract(seed.y * 5.3 + seed.w * 1.7);
  vGlint = max(grainGlint(p, seed, uTime) * grainGlints(tier), stirred);

  vColor = grainLit(mix(ramp(seed.w * 1.7 + seed.x * 0.3), uAccent, uAccentAmount) * 0.9, p);
  vColor *= grainTier(tier) / 0.644;
  // Thinned over the text, so the atmosphere never competes with it.
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float text = max(1.0 - smoothstep(uTextZone.x - 0.25, uTextZone.x, ndc.x), 1.0 - smoothstep(uTextZone.y - 0.25, uTextZone.y, ndc.y));
  vAlpha = (1.0 - text * 0.8) * uOpacity * fade * mix(0.12, 1.0, spread * spread) * (0.5 + seed.y * 0.5);
}
