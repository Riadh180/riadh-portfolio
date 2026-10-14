import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineSegments,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { sceneColors } from '@/styles/scene'
import routeFragment from '../../shaders/cardScenes/route.frag'
import routeVertex from '../../shaders/cardScenes/route.vert'
import { CardScene } from './CardScene'

const ROUTES = 16
const SEGMENTS = 48

/** A point on the unit sphere from latitude / longitude (radians). */
const onSphere = (lat: number, lon: number) =>
  new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))

/** Logistics (Kühne+Nagel): glowing shipping routes arcing over a dark globe. */
export class GlobeRoutes extends CardScene {
  private globe = new Group()
  private routeMaterial: ShaderMaterial

  constructor() {
    super(sceneColors.teal, sceneColors.warm)
    const body = new Mesh(
      this.own(new SphereGeometry(1, 48, 32)),
      this.glass([sceneColors.teal, sceneColors.glow, sceneColors.blue], 1.1),
    )
    this.globe.add(body)

    // Hubs: clusters of small lights on the surface.
    const hubs = Array.from({ length: 9 }, () => [
      (Math.random() - 0.5) * 2.2,
      Math.random() * 6.28,
    ])
    const cities: number[] = []
    for (let i = 0; i < 700; i++) {
      const [lat = 0, lon = 0] = hubs[i % hubs.length] ?? []
      const p = onSphere(lat + (Math.random() - 0.5) * 0.5, lon + (Math.random() - 0.5) * 0.7)
      cities.push(...p.multiplyScalar(1.004).toArray())
    }
    this.globe.add(this.dots(cities, [sceneColors.glow, sceneColors.teal, sceneColors.warm], 16, 1))

    // Routes between hubs: arcs lifted off the surface, as line segments with a pulse.
    const positions: number[] = []
    const along: number[] = []
    const offsets: number[] = []
    for (let r = 0; r < ROUTES; r++) {
      const a = hubs[r % hubs.length] ?? [0, 0]
      const b = hubs[(r * 3 + 2) % hubs.length] ?? [0, 1]
      const from = onSphere(a[0] ?? 0, a[1] ?? 0)
      const to = onSphere(b[0] ?? 0, b[1] ?? 0)
      const lift = 0.06 + from.distanceTo(to) * 0.12
      const offset = Math.random()
      const point = (t: number) =>
        from
          .clone()
          .lerp(to, t)
          .normalize()
          .multiplyScalar(1 + Math.sin(t * Math.PI) * lift)
      for (let s = 0; s < SEGMENTS; s++) {
        const t0 = s / SEGMENTS
        const t1 = (s + 1) / SEGMENTS
        positions.push(...point(t0).toArray(), ...point(t1).toArray())
        along.push(t0, t1)
        offsets.push(offset, offset)
      }
    }
    const routes = this.own(new BufferGeometry())
    routes.setAttribute('position', new Float32BufferAttribute(positions, 3))
    routes.setAttribute('along', new Float32BufferAttribute(along, 1))
    routes.setAttribute('offset', new Float32BufferAttribute(offsets, 1))
    this.routeMaterial = this.own(
      new ShaderMaterial({
        vertexShader: routeVertex,
        fragmentShader: routeFragment,
        uniforms: {
          uColor: { value: sceneColors.teal },
          uPulse: { value: sceneColors.warm },
          uTime: { value: 0 },
          uSpeed: { value: 0.18 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    this.globe.add(new LineSegments(routes, this.routeMaterial))

    this.globe.position.set(0.55, 0.32, 0)
    this.globe.rotation.x = 0.35
    this.scene.add(this.globe)
    this.camera.position.set(0, 0.2, 4.6)
    this.camera.lookAt(0.2, 0.1, 0)
  }

  update(time: number) {
    this.globe.rotation.y = time * 0.12
    this.routeMaterial.uniforms.uTime!.value = time
    this.globe.traverse((child) => {
      const material = (child as Mesh).material as ShaderMaterial | undefined
      if (material?.uniforms?.uTime && material !== this.routeMaterial)
        material.uniforms.uTime.value = time
    })
  }
}
