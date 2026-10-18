// sRGB-encoded colour to linear light. Three uploads video frames as they come (sRGB values in
// a linear texture) and decodes them only in its own materials; our shaders decode here.
vec3 decodeSrgb(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
