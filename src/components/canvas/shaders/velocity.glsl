// GPGPU velocity pass. `texturePosition`, `textureVelocity` and `resolution`
// are injected by GPUComputationRenderer; noise.glsl is prepended in TS.

uniform float uTime;
uniform float uDelta;
uniform float uFlowSpeed;
uniform float uFlowScale;
uniform float uDrift;
uniform float uStreamPull;
uniform vec3 uCenter;
uniform vec3 uBounds;

uniform sampler2D uTrail;
uniform mat4 uViewProjection;
uniform vec2 uWorldPerUv;
uniform float uFocusDistance;
uniform float uCursorStrength;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture2D(texturePosition, uv);
  vec3 position = particle.xyz;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;

  // Ambient currents: anisotropic curl noise (stretched along x) reads as streams.
  vec3 p = (position - uCenter) * vec3(0.45, 1.0, 0.8) * uFlowScale;
  vec3 flow = curlNoise(p + vec3(uTime * 0.03, 0.0, uTime * 0.02)) * uFlowSpeed;
  flow.x += uDrift * (0.6 + particle.w * 0.8);

  // Three undulating streams gather most particles; a quarter stay free as chaos.
  float lane = floor(particle.w * 4.0);
  if (lane < 3.0) {
    float k = lane - 1.0;
    float x = position.x;
    vec2 laneCenter = vec2(
      k * 1.7 + sin(x * 0.22 + uTime * 0.12 + lane * 2.1) * 1.2,
      uCenter.z + k * 1.6 + cos(x * 0.17 + uTime * 0.09 + lane * 1.3) * 1.6
    );
    flow.yz += (laneCenter - position.yz) * uStreamPull;
    flow.x += uDrift * 1.5;
  }

  // Soft containment above/below and in depth; x wraps in the position pass.
  vec3 local = position - uCenter;
  vec3 overflow = max(abs(local) - uBounds, 0.0) * sign(local);
  flow.yz -= overflow.yz * 0.8;

  velocity = mix(velocity, flow, 1.0 - exp(-uDelta * 1.2));

  // Cursor: project into screen space and get dragged by the trail field.
  vec4 clip = uViewProjection * vec4(position, 1.0);
  if (clip.w > 0.0) {
    vec2 screenUv = clip.xy / clip.w * 0.5 + 0.5;
    vec2 trail = texture2D(uTrail, screenUv).xy;
    vec2 trailWorld = trail * uWorldPerUv * (clip.w / uFocusDistance);
    float influence = clamp(length(trail) * 3.0, 0.0, 1.0) * uCursorStrength;
    velocity.xy = mix(velocity.xy, trailWorld * 0.9, influence * (1.0 - exp(-uDelta * 10.0)));
    velocity.z += length(trail) * uCursorStrength * (particle.w - 0.5) * uDelta * 4.0;
  }

  gl_FragColor = vec4(velocity, 1.0);
}
