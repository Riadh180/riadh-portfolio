// A card's dissolve dust: the world's glass grains (glassGrain.glsl prepended), each tinted by
// the spot of the image it broke away from; normal blending, so the chip's outline is its alpha.
varying vec3 vColor;
varying float vAlpha;
varying float vPointSize;
varying float vGlint;
varying float vPhase;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  if (length(c) > 1.0) discard;
  float body = grainBody(c, vPointSize, vPhase);
  if (body <= 0.01) discard;
  vec3 color = glassGrain(c, vPointSize, vColor * 0.8, vGlint, vPhase);
  gl_FragColor = vec4(color / max(body, 0.3), vAlpha * body);
  #include <colorspace_fragment>
}
