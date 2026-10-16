// A thin glass arc far behind The Core, out of focus: a soft, faint line along part of an
// ellipse, tinted like thin film along its length, with a glint that runs along it now and
// then, as if it turned through the rim light.
uniform float uTime;
uniform float uOpacity;
/** Arc: start and end angle (radians), thickness (uv units, soft), glint period and phase. */
uniform vec2 uArc;
uniform float uWidth;
uniform float uPeriod;
uniform float uPhase;
uniform vec3 uColors[3];

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  // Along the arc 0..1, fading out at both tips.
  float along = (a - uArc.x) / (uArc.y - uArc.x);
  float tips = smoothstep(0.0, 0.25, along) * (1.0 - smoothstep(0.75, 1.0, along));
  // Out of focus: a wide, soft cross-section with a brighter core.
  float d = abs(r - 0.82) / uWidth;
  float line = exp(-d * d) * 0.6 + exp(-d * d * 6.0) * 0.4;
  float x = fract(along * 1.3 + 0.2) * 3.0;
  vec3 film = x < 1.0 ? mix(uColors[0], uColors[1], x)
    : x < 2.0 ? mix(uColors[1], uColors[2], x - 1.0) : mix(uColors[2], uColors[0], x - 2.0);
  // The glint: once per period it sweeps the arc's length in about a second.
  float sweep = fract((uTime + uPhase) / uPeriod) * uPeriod / 1.2;
  float glint = exp(-pow((along - sweep) * 6.0, 2.0)) * step(sweep, 1.3);
  vec3 color = film * (0.16 + glint * 2.4);
  gl_FragColor = vec4(color * line * tips * uOpacity, 1.0);
}
