// Surface detail for the Work spine, mixed into three's physical shader (oilMaterial.ts).
// Positions are the mesh's own (object space), so the detail turns with the column.
// Kept to ~6 noise evaluations per pixel.

/** Patchy roughness: glossy where the surface is polished, matte in dull patches. */
float oilRoughness(float roughness, vec3 p) {
  return clamp(roughness * (1.0 + snoise(p * 3.1) * 0.7), 0.04, 1.0);
}

/** Fine grain in the normals (view space): the surface reads crumbly, not moulded. */
vec3 oilGrain(vec3 n, vec3 p) {
  vec3 q = p * 30.0;
  vec3 grain = vec3(snoise(q), snoise(q.yzx + 17.3), snoise(q.zxy - 9.1));
  return normalize(n + grain * 0.28);
}

float oilStreakMask = 0.0;
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
  float carried = smoothstep(-0.2, 0.3, snoise(vec3(floor(bands * 2.2) * 0.37, 0.0, 3.0)));
  oilStreakMask = (1.0 - smoothstep(0.0, 0.11, line)) * carried;
  oilStreakTone = fract(bands * 0.31 + warp * 0.2);
  iridescence *= oilStreakMask;
  thickness = mix(minimum, maximum, oilStreakTone);
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
