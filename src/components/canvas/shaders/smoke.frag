// The opening nebula: faint amber cloud masses with thin, bright gold filaments and a glow at
// the centre, where The Core floats (noise.glsl is prepended in TS).

uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform float uAspect;
/** Body of the cloud (deep amber) and its bright filaments and core glow (pale gold). */
uniform vec3 uColor;
uniform vec3 uHighlight;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
  float t = uTime * 0.05 + uSeed * 7.0;

  vec2 warp = p + 0.6 * vec2(snoise(vec3(p * 0.8 + 3.1, t)), snoise(vec3(p * 0.8 - 5.3, t + 1.7)));
  float body = snoise(vec3(warp * 1.1, t)) * 0.65 + snoise(vec3(warp * 2.3 + 7.0, t * 1.4)) * 0.35;
  float density = smoothstep(0.1, 0.9, body);
  float filament = pow(1.0 - abs(snoise(vec3(warp * 1.7, t * 1.3))), 18.0) * density;

  float r = length(p / vec2(uAspect, 1.0));
  float mask = smoothstep(1.0, 0.15, r);
  float glow = exp(-r * r * 7.0);

  // Mostly darkness: a faint amber body, thin glowing filaments, a soft glow at the core.
  vec3 color = uColor * density * density * 0.16 + uHighlight * (filament * 2.2 + glow * 0.22);
  gl_FragColor = vec4(color * mask * uOpacity, 1.0);
}
