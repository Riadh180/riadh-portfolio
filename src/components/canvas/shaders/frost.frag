// A card's screen seen through thick, frosted glass (noise.glsl is prepended in TS): the
// image is blurred and bent by mottled frosting, with a milky haze that brightens where the
// frost is thick and towards grazing angles; the title stays crisp on top. uBlur adds depth
// of field for cards away from the focus.

uniform sampler2D uImage;
uniform sampler2D uTitle;
uniform float uBrightness;
uniform float uBlur;
uniform float uSeed;
uniform vec3 uHaze;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  // Mottled frost: how thick the frosting is here.
  vec2 p = vUv * vec2(3.2, 2.0) + uSeed * 7.0;
  float frost = snoise(vec3(p, uSeed)) * 0.6 + snoise(vec3(p * 3.1, uSeed + 4.0)) * 0.4;
  frost = smoothstep(-0.6, 0.8, frost);

  // The glass bends the image a little where the frost is uneven.
  vec2 bend = vec2(snoise(vec3(p * 1.7, 2.0)), snoise(vec3(p * 1.7, 9.0))) * 0.012;
  vec2 uv = vUv + bend;

  // Blur: a small disc of taps, wider where the frost is thicker or the card is out of focus.
  float radius = 0.004 + frost * 0.01 + uBlur * 0.02;
  vec3 color = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.39996;
    float r = sqrt(float(i) / 12.0) * radius;
    color += texture2D(uImage, uv + vec2(cos(a), sin(a) * 1.6) * r).rgb;
  }
  color /= 12.0;

  // Milky haze over the frost, stronger at grazing angles (thick glass seen edge-on).
  float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
  color = mix(color, uHaze, frost * 0.22 + grazing * 0.25);

  vec4 title = texture2D(uTitle, vUv);
  color = mix(color, title.rgb, title.a * (1.0 - uBlur * 0.6));
  gl_FragColor = vec4(color * uBrightness, 1.0);
  #include <colorspace_fragment>
}
