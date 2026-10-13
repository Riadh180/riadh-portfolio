// GPGPU velocity pass. `texturePosition`, `textureVelocity` and `resolution`
// are injected by GPUComputationRenderer; noise.glsl is prepended in TS.

uniform float uTime;
uniform float uDelta;
uniform float uFlowSpeed;
uniform float uFlowScale;
uniform float uDrift;
uniform vec3 uCenter;
uniform vec3 uBounds;

uniform sampler2D uTrail;
uniform mat4 uViewProjection;
uniform vec2 uWorldPerUv;
uniform float uFocusDistance;
uniform float uCursorStrength;

// Transitions: particles with a target (w = 1) assemble into it while uForm > 0,
// and are scattered on a curl burst when released (uScatter).
uniform sampler2D uTargets;
uniform float uForm;
uniform float uScatter;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture2D(texturePosition, uv);
  vec3 position = particle.xyz;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;
  vec4 target = texture2D(uTargets, uv);
  float bound = target.w * uForm;

  // Ambient dust: slow curl-noise drift in world space, softly contained in z (x and y
  // wrap round the field, which follows the camera down the path).
  vec3 local = position - uCenter;
  vec3 flow = curlNoise(position * uFlowScale + vec3(0.0, uTime * 0.02, uTime * 0.015)) * uFlowSpeed;
  flow.x += uDrift;
  vec3 overflow = max(abs(local) - uBounds, 0.0) * sign(local);
  flow.z -= overflow.z * 0.8;
  velocity = mix(velocity, flow, (1.0 - exp(-uDelta * 1.2)) * (1.0 - bound));

  // Assemble: seek the target and arrive softly.
  if (bound > 0.0) {
    vec3 seek = (target.xyz - position) * 5.0;
    velocity = mix(velocity, seek, bound * (1.0 - exp(-uDelta * 7.0)));
  }

  // Dissolve: released particles burst outward along the curl field.
  velocity += curlNoise(position * 0.6 + uTime * 0.2) * uScatter * target.w * uDelta;

  // Cursor: project into screen space and get dragged by the trail field.
  vec4 clip = uViewProjection * vec4(position, 1.0);
  if (clip.w > 0.0) {
    vec2 screenUv = clip.xy / clip.w * 0.5 + 0.5;
    vec2 trail = texture2D(uTrail, screenUv).xy;
    vec2 trailWorld = trail * uWorldPerUv * (clip.w / uFocusDistance);
    float influence = clamp(length(trail) * 3.0, 0.0, 1.0) * uCursorStrength * (1.0 - bound);
    velocity.xy = mix(velocity.xy, trailWorld * 0.9, influence * (1.0 - exp(-uDelta * 10.0)));
    velocity.z += length(trail) * uCursorStrength * (particle.w - 0.5) * uDelta * 4.0;
  }

  gl_FragColor = vec4(velocity, 1.0);
}
