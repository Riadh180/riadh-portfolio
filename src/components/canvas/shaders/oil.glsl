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
