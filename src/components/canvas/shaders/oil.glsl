// Surface detail for the Work spine, mixed into three's physical shader (oilMaterial.ts).
// Positions are the mesh's own (object space), so the detail turns with the column.
// Kept to one noise evaluation and one 8-cell facet lookup per pixel (lite: the noise only).

vec3 oilHash3(vec3 c) {
  return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)),
    dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

/** The facet under the pixel, 0..1 (set by oilFacets): drives the patchy roughness. */
float oilFacet = 0.5;

/** Patchy roughness: each broad facet a little more or less polished than its neighbours. */
float oilRoughness(float roughness) {
  return clamp(roughness * (0.75 + oilFacet * 0.5), 0.04, 1.0);
}

/**
 * Broad, softened facets (view-space normal): large cells in object space, each tilted a
 * little its own way, blended across the cell edges, so a plate reads as a few curved
 * planes. Full tier only (lite: the smooth plates alone).
 */
vec3 oilFacets(vec3 n, vec3 p) {
  vec3 q = p * 5.0;
  vec3 tilt = vec3(0.0);
  vec3 second = vec3(0.0);
  float best = 8.0;
  float next = 8.0;
  vec3 near = floor(q - 0.5);
  for (int z = 0; z <= 1; z++) {
    for (int y = 0; y <= 1; y++) {
      for (int x = 0; x <= 1; x++) {
        vec3 c = near + vec3(float(x), float(y), float(z));
        vec3 d = c + oilHash3(c) - q;
        float dist = dot(d, d);
        vec3 t = oilHash3(c + 31.7) * 2.0 - 1.0;
        if (dist < best) {
          next = best;
          second = tilt;
          best = dist;
          tilt = t;
          oilFacet = fract(t.x * 7.31 + 0.5);
        } else if (dist < next) {
          next = dist;
          second = t;
        }
      }
    }
  }
  tilt = mix(second, tilt, 0.5 + 0.5 * smoothstep(0.0, 0.35, next - best));
  return normalize(n + tilt * 0.14);
}

/**
 * Simplex noise with its gradient (stegu/webgl-noise, MIT; the same field as snoise), for the
 * sculpted column's carving: a smooth bump from the slope itself, no screen derivatives.
 */
float snoiseGrad(vec3 v, out vec3 gradient) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3));
  vec4 temp = m2 * m * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}

/** The sculpted column's carving under the pixel (set by oilCrust): 0..1, 1 on a ridge. */
float oilCrustHeight = 0.0;
/** Its slope, in object space. */
vec3 oilCrustSlope = vec3(0.0);

/**
 * The sculpted column's carving: fine wandering ridges at two scales in object space (lite: the
 * larger only). It breaks a highlight up into the speckled sheen of a carved, oily surface
 * instead of one smooth chrome reflection.
 */
void oilCrust(vec3 p) {
  vec3 g;
  float n = snoiseGrad(p * 5.0, g);
  float ridge = 1.0 - abs(n);
  oilCrustHeight = ridge * ridge;
  oilCrustSlope = -2.0 * ridge * sign(n) * g * 5.0;
  #ifndef OIL_LITE
    float m = snoiseGrad(p * 12.0 + 7.1, g);
    float fine = 1.0 - abs(m);
    oilCrustHeight = oilCrustHeight * 0.6 + fine * fine * fine * 0.4;
    oilCrustSlope = oilCrustSlope * 0.6 - 3.0 * fine * fine * sign(m) * g * 12.0 * 0.4;
  #endif
}

/**
 * A bump from a height's slope (view space, the normal's): the normal tilts against the slope's
 * part along the surface; `depth` is the height's range in world units.
 */
vec3 oilBump(vec3 n, vec3 slope, float depth) {
  return normalize(n - (slope - dot(slope, n) * n) * depth);
}

/**
 * Carved ridges and grooves (view-space normal): fine, roughly horizontal grooves that
 * wander round the plates (warped by noise), so a big highlight breaks up along the forms
 * like on a chrome sculpture. `axis` is the object's up in view space.
 */
vec3 oilGrooves(vec3 n, vec3 p, vec3 axis) {
  float warp = snoise(p * vec3(1.4, 0.6, 1.4)) * 2.2;
  float wave = sin(p.y * 26.0 + warp * 3.0);
  // Tilt the normal up and down the column with the groove profile (sharper crests).
  float slope = sign(wave) * pow(abs(wave), 0.6);
  vec3 up = normalize(axis - n * dot(axis, n));
  return normalize(n + up * slope * 0.09);
}

/**
 * The thin film's colour, by angle and place: teal and pink dominant, a little gold, so a
 * reflection seen at a grazing angle runs teal → pink → teal, with a rare gold band.
 */
vec3 oilFilm(float t, vec3 teal, vec3 pink, vec3 gold) {
  float x = fract(t);
  if (x < 0.42) return mix(teal, pink, smoothstep(0.0, 0.42, x));
  if (x < 0.84) return mix(pink, teal, smoothstep(0.42, 0.84, x));
  return mix(teal, gold, sin((x - 0.84) / 0.16 * 3.14159));
}
