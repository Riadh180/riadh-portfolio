// One layer of smoke under the dust slab: cloudy volumes with dark gaps and a few thin,
// brighter wisps (read from the baked field), in the slab's drifting hue.

uniform sampler2D uField;
uniform float uOpacity;
uniform float uLayer;
uniform vec3 uColors[3];
uniform float uCycle;

varying vec2 vUv;

vec3 ramp(float t) {
  float x = fract(t) * 3.0;
  if (x < 1.0) return mix(uColors[0], uColors[1], x);
  if (x < 2.0) return mix(uColors[1], uColors[2], x - 1.0);
  return mix(uColors[2], uColors[0], x - 2.0);
}

void main() {
  // Each layer reads the field a little further along, so the layers read as depth.
  vec2 field = texture2D(uField, vUv + uLayer * vec2(0.018, -0.024)).rg;
  float density = field.r;
  vec3 color = ramp(uCycle + density * 0.12) * (density * density * 0.2 + field.g * 0.4);
  gl_FragColor = vec4(color * uOpacity, 1.0);
}
