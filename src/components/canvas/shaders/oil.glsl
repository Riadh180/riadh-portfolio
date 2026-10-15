// Surface detail for the Work spine, mixed into three's physical shader (oilMaterial.ts).
// Positions are the mesh's own (object space), so the detail turns with the column.
// Kept to ~6 noise evaluations and one 8-cell facet lookup per pixel.

/** Patchy roughness: glossy where the surface is polished, matte in dull patches. */
float oilRoughness(float roughness, vec3 p) {
  return clamp(roughness * (1.0 + snoise(p * 3.1) * 0.7), 0.04, 1.0);
}

/**
 * The crystal crust (view-space normal): the surface is split into small cells in object
 * space (so they turn with the column), and each cell's facet is tilted its own way, so
 * every few pixels a facet catches the light or doesn't. Full: the nearest of the 8 jittered
 * cells round the pixel (irregular facets); lite: one cube cell per pixel (cheaper, more
 * regular).
 */
vec3 oilHash3(vec3 c) {
  return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)),
    dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

/** The facet under the pixel, 0..1: each facet's thin film has its own thickness (hue). */
float oilFacet = 0.0;

vec3 oilFacets(vec3 n, vec3 p) {
  vec3 q = p * 21.0;
  #ifdef OIL_LITE
    vec3 base = floor(q);
    vec3 tilt = oilHash3(base) * 2.0 - 1.0;
    oilFacet = oilHash3(base + 7.3).x;
  #else
    vec3 tilt = vec3(0.0);
    float best = 8.0;
    vec3 near = floor(q - 0.5);
    for (int z = 0; z <= 1; z++) {
      for (int y = 0; y <= 1; y++) {
        for (int x = 0; x <= 1; x++) {
          vec3 c = near + vec3(float(x), float(y), float(z));
          vec3 d = c + oilHash3(c) - q;
          float dist = dot(d, d);
          if (dist < best) {
            best = dist;
            tilt = oilHash3(c + 31.7) * 2.0 - 1.0;
            oilFacet = oilHash3(c + 7.3).x;
          }
        }
      }
    }
  #endif
  return normalize(n + tilt * 0.32);
}

float oilStreakMask = 0.0;
float oilGrazing = 0.0;
float oilStreakTone = 0.0;

/**
 * Thin, sharp streaks of colour on a dark body: the film only shows along narrow bands
 * that sweep diagonally round and up the column, gently warped; between them the body
 * stays dark. The film thickness drifts along each streak (teal → green → violet).
 */
void oilStreaks(inout float iridescence, inout float thickness, vec3 p, float minimum, float maximum) {
  float warp = snoise(p * vec3(0.8, 0.35, 0.8));
  float bands = p.y * 1.7 + atan(p.z, p.x) * 0.9 + warp * 0.9;
  float line = abs(fract(bands * 2.2) - 0.5) * 2.0;
  // Only some bands carry colour, so the streaks come in irregular groups.
  float carried = smoothstep(0.35, 0.75, snoise(vec3(floor(bands * 2.2) * 0.37, 0.0, 3.0)));
  // Broken along their length too, so they read as sheen catching folds, not wires.
  float broken = smoothstep(-0.1, 0.5, snoise(p * 1.6 + 7.0));
  oilStreakMask = (1.0 - smoothstep(0.0, 0.06, line)) * carried * broken;
  oilStreakTone = fract(bands * 0.31 + warp * 0.2);
  // The film shows on every facet, each its own colour, strongest along the streaks and at
  // grazing angles (oilGrazing, set by the caller).
  iridescence *= max(oilStreakMask, mix(0.55, 1.0, oilGrazing));
  thickness = mix(minimum, maximum, mix(oilFacet, oilStreakTone, oilStreakMask));
}

/**
 * A glow of the streaks' own colour, strongest at grazing angles: a dark body only
 * reflects colour where the light happens to be, so this keeps the streaks readable as
 * thin lines of colour across the whole mass.
 */
vec3 oilStreakGlow(vec3 normal, vec3 viewDir, vec3 teal, vec3 green, vec3 violet, float strength) {
  vec3 tone = oilStreakTone < 0.5
    ? mix(teal, green, oilStreakTone * 2.0)
    : mix(green, violet, oilStreakTone * 2.0 - 1.0);
  float grazing = pow(1.0 - abs(dot(normal, viewDir)), 1.5);
  return tone * oilStreakMask * (0.3 + 0.7 * grazing) * strength;
}
