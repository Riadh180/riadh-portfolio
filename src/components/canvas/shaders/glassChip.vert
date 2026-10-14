// Glass chips as real little shards (instanced faceted octahedra), moved on the GPU like
// the old pebble points: column chips rise up the spine in a slow helix, cloud chips
// circle their small cloud. Each tumbles on its own axis. Depth reads through size
// (perspective) and softness: crisp near the focus distance, larger and soft close to the
// lens, tiny and faint far away.

uniform float uTime;
uniform float uSize;
uniform float uRadius;
uniform float uRise;
uniform float uHalfHeight;
uniform float uFocusDistance;
uniform vec3 uPalette[4];

/** angle, reach (× radius), start height, speed. */
attribute vec4 orbit;
/** Cloud centre (xyz) and spread; spread 0 = a column chip. */
attribute vec4 cloud;
/** size, colour pick, tumble phase, brightness. */
attribute vec4 seed;

varying vec3 vNormal;
varying vec3 vView;
varying vec3 vTint;
varying float vSoft;
varying float vSeed;

vec3 chipColor(float pick) {
  if (pick < 0.38) return uPalette[0];
  if (pick < 0.66) return uPalette[1];
  if (pick < 0.86) return uPalette[2];
  return uPalette[3];
}

mat3 rotation(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float o = 1.0 - c;
  return mat3(
    o * axis.x * axis.x + c, o * axis.x * axis.y + axis.z * s, o * axis.z * axis.x - axis.y * s,
    o * axis.x * axis.y - axis.z * s, o * axis.y * axis.y + c, o * axis.y * axis.z + axis.x * s,
    o * axis.z * axis.x + axis.y * s, o * axis.y * axis.z - axis.x * s, o * axis.z * axis.z + c
  );
}

void main() {
  vec3 p;
  float ends = 1.0;
  if (cloud.w > 0.0) {
    float a = orbit.x + uTime * 0.15 * orbit.w;
    vec3 offset = vec3(cos(a), sin(a * 0.7 + orbit.z) * 0.6, sin(a)) * orbit.y * cloud.w;
    p = cloud.xyz + offset;
  } else {
    float span = uHalfHeight * 2.0;
    float y = mod(orbit.z + uTime * uRise * orbit.w + uHalfHeight, span) - uHalfHeight;
    float a = orbit.x + uTime * 0.1 + y * 0.3;
    float r = uRadius * orbit.y;
    p = vec3(cos(a) * r, y, sin(a) * r);
    ends = smoothstep(uHalfHeight, uHalfHeight - 1.0, abs(y));
  }

  // A shard: the octahedron stretched long and flat, its own proportions per chip.
  vec3 shape = vec3(1.0, 0.45 + seed.w * 0.4, 0.22 + seed.z * 0.2);
  float size = uSize * mix(0.6, 2.6, pow(seed.x, 5.0)) * ends;
  mat3 spin = rotation(vec3(seed.z - 0.5, seed.w - 0.5, seed.x - 0.4), uTime * (0.25 + seed.z * 0.6) + seed.y * 20.0);
  vec3 local = spin * (position * shape) * size;

  vec4 mv = modelViewMatrix * vec4(p + local, 1.0);
  gl_Position = projectionMatrix * mv;
  vNormal = normalize(normalMatrix * (spin * (normal / shape)));
  vView = normalize(-mv.xyz);

  float depth = -mv.z;
  float nearSoft = 1.0 - smoothstep(uFocusDistance * 0.35, uFocusDistance * 0.75, depth);
  float farSoft = smoothstep(uFocusDistance * 1.4, uFocusDistance * 2.6, depth);
  vSoft = max(nearSoft, farSoft);
  vTint = chipColor(seed.y);
  vSeed = seed.w;
}
