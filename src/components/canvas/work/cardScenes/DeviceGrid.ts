import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  Object3D,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { CardScene } from './CardScene'

const COLUMNS = 11
const ROWS = 7
const GAP = 0.36

/** Device management (RRI at E.ON): a grid of small devices pulsing like a network. */
export class DeviceGrid extends CardScene {
  private devices: InstancedMesh
  private grid = new Group()
  private color = new Color()
  private dim = new Color().copy(sceneColors.blue).multiplyScalar(0.18)

  constructor() {
    super(sceneColors.blue, sceneColors.glow)
    const box = this.own(new BoxGeometry(0.24, 0.15, 0.05))
    const material = this.own(new MeshBasicMaterial({ toneMapped: false }))
    this.devices = new InstancedMesh(box, material, COLUMNS * ROWS)
    const place = new Object3D()
    const links: number[] = []
    const at = (c: number, r: number) => [
      (c - (COLUMNS - 1) / 2) * GAP,
      (r - (ROWS - 1) / 2) * GAP,
      0,
    ]
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        const [x = 0, y = 0, z = 0] = at(c, r)
        place.position.set(x, y, z)
        place.updateMatrix()
        this.devices.setMatrixAt(r * COLUMNS + c, place.matrix)
        this.devices.setColorAt(r * COLUMNS + c, this.dim)
        if (c < COLUMNS - 1) links.push(...at(c, r), ...at(c + 1, r))
        if (r < ROWS - 1) links.push(...at(c, r), ...at(c, r + 1))
      }
    }
    const linkGeometry = this.own(new BufferGeometry())
    linkGeometry.setAttribute('position', new Float32BufferAttribute(links, 3))
    const linkMaterial = this.own(
      new LineBasicMaterial({
        color: new Color().copy(sceneColors.blue).multiplyScalar(0.35),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.grid.add(new LineSegments(linkGeometry, linkMaterial), this.devices)
    // Seen in perspective, receding up and away; right of the title.
    this.grid.rotation.set(-1.05, 0, 0.18)
    this.grid.position.set(0.35, 0.15, 0)
    this.scene.add(this.grid)
    this.camera.position.set(0, 0, 4.2)
    this.camera.lookAt(0.2, 0.25, 0)
  }

  update(time: number) {
    // Two pulses ripple out from different devices, like updates rolling across a fleet.
    const sources = [
      [Math.sin(time * 0.3) * 1.2, Math.cos(time * 0.23) * 0.6],
      [-1.4, 0.8],
    ]
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        const x = (c - (COLUMNS - 1) / 2) * GAP
        const y = (r - (ROWS - 1) / 2) * GAP
        let wave = 0
        sources.forEach(([sx = 0, sy = 0], i) => {
          const d = Math.hypot(x - sx, y - sy)
          wave = Math.max(wave, Math.max(0, Math.sin(d * 4 - time * (2 + i * 0.7))) ** 6)
        })
        this.color
          .copy(this.dim)
          .lerp(sceneColors.glow, wave * 0.85)
          .lerp(sceneColors.blue, (1 - wave) * 0.15)
        this.devices.setColorAt(r * COLUMNS + c, this.color)
      }
    }
    if (this.devices.instanceColor) this.devices.instanceColor.needsUpdate = true
    this.grid.rotation.z = 0.18 + Math.sin(time * 0.1) * 0.05
  }
}
