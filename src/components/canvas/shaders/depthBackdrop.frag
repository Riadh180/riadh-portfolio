// Depth's own darkness: deep teal under the surface, sinking to near black towards the
// bottom of the frame, with a strong vignette, so it reads deep rather than as an even fog.

uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uOpacity;
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec3 color = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y) * smoothstep(0.0, 0.9, vUv.y));
  vec2 d = (vUv - vec2(0.5, 0.6)) * vec2(uAspect, 1.0);
  float vignette = smoothstep(1.25, 0.25, length(d));
  gl_FragColor = vec4(color * mix(0.55, 1.0, vignette), uOpacity);
}
