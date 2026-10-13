// The water surface seen from below (noise.glsl is prepended in TS). A bright window of
// light straight overhead (Snell's window), fading to the dark mirror of total internal
// reflection towards the edges; across it, a slowly shifting web of caustic light made of
// two layers of warped ridged noise. Deep teal-green; the glow colour where it's brightest.

uniform float uTime;
uniform vec3 uCameraPosition;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlow;
uniform float uIntensity;
/** The water's darkness beyond: the far surface fades into it, so there's no horizon line. */
uniform vec3 uFog;

varying vec3 vWorld;

float ridges(vec2 p, float t) {
  vec2 warp = p + 0.6 * vec2(snoise(vec3(p * 0.5, t)), snoise(vec3(p * 0.5 + 7.3, t)));
  return pow(1.0 - abs(snoise(vec3(warp, t * 1.3))), 6.0);
}

void main() {
  vec3 view = normalize(vWorld - uCameraPosition);
  // 1 straight up, 0 at the edge of the window (~48° from vertical), negative beyond.
  float window = smoothstep(0.62, 0.95, view.y);
  vec2 p = vWorld.xz * 0.45;
  float t = uTime * 0.12;
  float web = ridges(p, t) * 0.65 + ridges(p * 1.9 + 3.0, t * 1.4) * 0.35;
  vec3 color = mix(uDeep, uShallow, window);
  color += uGlow * web * (0.06 + window * 0.85);
  // Distance haze: far parts of the surface sink into the deep colour.
  float far = smoothstep(5.0, 24.0, length(vWorld.xz - uCameraPosition.xz));
  gl_FragColor = vec4(mix(color * uIntensity, uFog, far), 1.0);
}
