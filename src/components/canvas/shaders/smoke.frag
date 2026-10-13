// Smoky wisps: thin, curling strands from ridged, domain-warped simplex noise (noise.glsl
// is prepended in TS). Soft at the edges and clear in the middle, where The Core floats.

uniform float uTime;
uniform float uOpacity;
uniform float uSeed;
uniform float uAspect;
uniform vec3 uColor;
uniform vec3 uHighlight;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
  float t = uTime * 0.04 + uSeed * 7.0;

  vec2 warp = p + 0.55 * vec2(snoise(vec3(p * 0.8 + 3.1, t)), snoise(vec3(p * 0.8 - 5.3, t + 1.7)));
  float ridge = 1.0 - abs(snoise(vec3(warp * 1.4, t * 1.3)));
  float strands = pow(ridge, 14.0) * smoothstep(-0.3, 0.5, snoise(vec3(p * 0.6, t * 0.7 + 4.0)));

  float r = length(p / vec2(uAspect, 1.0));
  float mask = smoothstep(1.0, 0.35, r) * smoothstep(0.08, 0.3, r);

  // Pale: mostly white smoke with a gold cast.
  vec3 color = mix(uColor, uHighlight, 0.55 + 0.45 * pow(ridge, 24.0));
  gl_FragColor = vec4(color * strands * mask * uOpacity, 1.0);
}
