import {
  DataTexture,
  FloatType,
  HalfFloatType,
  MathUtils,
  Matrix4,
  NearestFilter,
  type PerspectiveCamera,
  type Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import { sceneConfig } from '@/styles/scene'
import noise from '../shaders/noise.glsl'
import positionShader from '../shaders/position.glsl'
import trailShader from '../shaders/trail.glsl'
import velocityShader from '../shaders/velocity.glsl'
import type { Pointer } from '../usePointer'

/** The volume the field lives in. x wraps; y and z are softly contained. */
export const FIELD = {
  center: new Vector3(0, 0, -1.5),
  bounds: new Vector3(11, 5.2, 6.5),
}

const TRAIL_SIZE = 128

export type StepInput = {
  camera: PerspectiveCamera
  aspect: number
  /** Real frame time, for the pointer trail. */
  rawDelta: number
  /** Scaled frame time, for the particles (slower with reduced motion). */
  delta: number
  time: number
  pointer: Pointer
  cursorStrength: number
  /** 0..1: how strongly particles hold their targets. */
  form: number
  /** Burst strength for particles being released (dissolve). */
  scatter: number
}

export type Simulation = ReturnType<typeof createSimulation>

/** Per-particle attributes: the sim texel (stored as position.xy) and a random seed. */
export function createParticleAttributes(size: number) {
  const count = size * size
  const references = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    references[i * 3] = ((i % size) + 0.5) / size
    references[i * 3 + 1] = (Math.floor(i / size) + 0.5) / size
    for (let j = 0; j < 4; j++) seeds[i * 4 + j] = Math.random()
  }
  return { references, seeds }
}

function seedPositions(texture: Texture) {
  const { data } = texture.image as { data: Float32Array }
  const { center, bounds } = FIELD
  for (let i = 0; i < data.length; i += 4) {
    data[i] = center.x + (Math.random() * 2 - 1) * bounds.x
    data[i + 1] = center.y + (Math.random() * 2 - 1) * bounds.y
    data[i + 2] = center.z + (Math.random() * 2 - 1) * bounds.z
    data[i + 3] = Math.random()
  }
}

export function createSimulation(gl: WebGLRenderer, size: number) {
  const particles = new GPUComputationRenderer(size, size, gl)
  const initialPositions = particles.createTexture()
  seedPositions(initialPositions)

  const positionVariable = particles.addVariable(
    'texturePosition',
    positionShader,
    initialPositions,
  )
  const velocityVariable = particles.addVariable(
    'textureVelocity',
    `${noise}\n${velocityShader}`,
    particles.createTexture(),
  )
  particles.setVariableDependencies(positionVariable, [positionVariable, velocityVariable])
  particles.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable])

  const trail = new GPUComputationRenderer(TRAIL_SIZE, TRAIL_SIZE, gl)
  trail.setDataType(HalfFloatType)
  const trailVariable = trail.addVariable('textureTrail', trailShader, trail.createTexture())
  trail.setVariableDependencies(trailVariable, [trailVariable])

  // One target per particle (xyz, w = 1 if this particle takes part in the shape).
  const targets = new DataTexture(new Float32Array(size * size * 4), size, size)
  targets.type = FloatType
  targets.minFilter = targets.magFilter = NearestFilter
  targets.needsUpdate = true

  const positionUniforms = {
    uDelta: { value: 0 },
    uCenter: { value: FIELD.center },
    uBounds: { value: FIELD.bounds },
  }
  const trailUniforms = {
    uPointer: { value: new Vector2(0.5, 0.5) },
    uPointerVelocity: { value: new Vector2() },
    uAspect: { value: 1 },
    uRadius: { value: 0.006 },
    uDecay: { value: 0.95 },
    uDelta: { value: 0 },
  }
  const velocityUniforms = {
    uTime: { value: 0 },
    uDelta: { value: 0 },
    uFlowSpeed: { value: 0 },
    uFlowScale: { value: 0 },
    uDrift: { value: 0 },
    uCenter: { value: FIELD.center },
    uBounds: { value: FIELD.bounds },
    uTrail: { value: null as Texture | null },
    uViewProjection: { value: new Matrix4() },
    uWorldPerUv: { value: new Vector2() },
    uFocusDistance: { value: 10 },
    uCursorStrength: { value: 0 },
    uTargets: { value: targets },
    uForm: { value: 0 },
    uScatter: { value: 0 },
  }
  Object.assign(positionVariable.material.uniforms, positionUniforms)
  Object.assign(velocityVariable.material.uniforms, velocityUniforms)
  Object.assign(trailVariable.material.uniforms, trailUniforms)

  const error = particles.init() ?? trail.init()
  if (error) throw new Error(`Particle simulation failed to initialise: ${error}`)

  const lastPointer = new Vector2()
  let pointerWasActive = false

  /** Pointer velocity in uv/s; the first move only establishes a baseline. */
  function updatePointer({ pointer, rawDelta }: StepInput) {
    const velocity = trailUniforms.uPointerVelocity.value
    if (pointer.active && pointerWasActive) {
      velocity
        .subVectors(pointer.uv, lastPointer)
        .divideScalar(Math.max(rawDelta, 1e-3))
        .clampLength(0, 4)
    } else {
      velocity.set(0, 0)
    }
    pointerWasActive = pointer.active
    lastPointer.copy(pointer.uv)
    trailUniforms.uPointer.value.copy(pointer.uv)
  }

  function step(input: StepInput) {
    const { camera, aspect, rawDelta, delta, time, cursorStrength } = input
    const { flow, cursor, particles: particleConfig } = sceneConfig

    updatePointer(input)
    trailUniforms.uAspect.value = aspect
    trailUniforms.uRadius.value = cursor.radius
    trailUniforms.uDecay.value = Math.pow(0.95, rawDelta * 60)
    trailUniforms.uDelta.value = rawDelta
    trail.compute()

    const focusDistance = particleConfig.focusDistance
    const halfHeight = Math.tan(MathUtils.degToRad(camera.fov / 2)) * focusDistance

    velocityUniforms.uTime.value = time
    velocityUniforms.uDelta.value = delta
    velocityUniforms.uFlowSpeed.value = flow.speed
    velocityUniforms.uFlowScale.value = flow.scale
    velocityUniforms.uDrift.value = flow.drift
    velocityUniforms.uForm.value = input.form
    velocityUniforms.uScatter.value = input.scatter
    velocityUniforms.uTrail.value = trail.getCurrentRenderTarget(trailVariable).texture
    velocityUniforms.uViewProjection.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    )
    velocityUniforms.uWorldPerUv.value.set(2 * halfHeight * camera.aspect, 2 * halfHeight)
    velocityUniforms.uFocusDistance.value = focusDistance
    velocityUniforms.uCursorStrength.value = cursor.strength * cursorStrength
    positionUniforms.uDelta.value = delta
    particles.compute()

    return {
      positions: particles.getCurrentRenderTarget(positionVariable).texture,
      velocities: particles.getCurrentRenderTarget(velocityVariable).texture,
    }
  }

  /** Assigns shape points to the first particles; the rest stay free dust. */
  function setTargets(points: Float32Array | null) {
    const data = targets.image.data as Float32Array
    data.fill(0)
    if (points) {
      const count = Math.min(points.length / 3, size * size)
      for (let i = 0; i < count; i++) {
        data.set(points.subarray(i * 3, i * 3 + 3), i * 4)
        data[i * 4 + 3] = 1
      }
    }
    targets.needsUpdate = true
  }

  return {
    step,
    setTargets,
    dispose: () => {
      particles.dispose()
      trail.dispose()
      targets.dispose()
    },
  }
}
