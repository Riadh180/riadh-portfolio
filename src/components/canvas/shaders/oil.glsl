// Surface detail for the Work spine, mixed into three's physical shader (oilMaterial.ts).
// Positions are the mesh's own (object space), so the detail turns with the column.
// Kept to ~7 noise evaluations and one 8-cell facet lookup per pixel.

/** Patchy roughness: glossy where the surface is polished, matte in dull patches. */
float oilRoughness(float roughness, vec3 p) {
  return clamp(roughness * (1.0 + snoise(p * 3.1) * 0.7), 0.04, 1.0);
}

vec3 oilHash3(vec3 c) {
  return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)),
    dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

/**
 * Broad, softened facets (view-space normal): large cells in object space (so they turn with
 * the column), each tilted a little its own way, the tilt blended across the cell edges so
 * a lobe reads as a few smooth curved planes, each catching one broad highlight. Full: the
 * nearest jittered cell of 8, faded into the second nearest; lite: none (the smooth lobes
 * alone, same segments and highlights).
 */
vec3 oilFacets(vec3 n, vec3 p) {
  vec3 q = p * 5.0;
  #ifdef OIL_LITE
    return n;
  #else
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
          } else if (dist < next) {
            next = dist;
            second = t;
          }
        }
      }
    }
    // Softened: the two nearest cells blend over a wide edge.
    tilt = mix(second, tilt, 0.5 + 0.5 * smoothstep(0.0, 0.35, next - best));
    return normalize(n + tilt * 0.16);
  #endif
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
  // The film shows at grazing angles (oilGrazing, set by the caller: the iridescent edges
  // of the highlights and the silhouette) and faintly along the streaks; face-on the body
  // stays dark and clean. Its thickness drifts slowly over the surface (teal → pink → gold).
  iridescence *= max(oilStreakMask * 0.5, oilGrazing);
  thickness = mix(minimum, maximum, fract(snoise(p * 0.7) * 0.5 + p.y * 0.12 + 0.5));
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
