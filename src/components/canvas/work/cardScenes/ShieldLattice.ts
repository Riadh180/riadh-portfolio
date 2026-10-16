import {
  AdditiveBlending,
  Color,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  type ShaderMaterial,
  Shape,
  TorusGeometry,
} from 'three'
import { sceneColors } from '@/styles/scene'
import { roundedRectShape } from '../../hero/bandGeometry'
import { CARD_TONES, CardScene } from './CardScene'

/** The shield's outline: flat top with rounded shoulders, curving down to a point. */
function shieldShape() {
  const s = new Shape()
  s.moveTo(-0.7, 0.75)
  s.quadraticCurveTo(0, 0.95, 0.7, 0.75)
  s.quadraticCurveTo(0.72, -0.25, 0, -0.95)
  s.quadraticCurveTo(-0.72, -0.25, -0.7, 0.75)
  return s
}

/** Security (Adesso): a glass shield with a lock, inside a slowly turning lattice. */
export class ShieldLattice extends CardScene {
  private group = new Group()
  private lattice: LineSegments
  private materials: ShaderMaterial[] = []
  private flaws: ReturnType<CardScene['dots']>

  constructor() {
    super(CARD_TONES.slate, sceneColors.teal)
    // Deep teal-slate glass with a wine rim light.
    const rim: [Color, Color, Color] = [CARD_TONES.slate, sceneColors.teal, CARD_TONES.wine]
    const shieldMaterial = this.glass(rim, 1.3)
    const shield = new Mesh(
      this.own(
        new ExtrudeGeometry(shieldShape(), {
          depth: 0.08,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelSegments: 4,
          curveSegments: 24,
        }),
      ),
      shieldMaterial,
    )
    const lockMaterial = this.glass(rim, 1.6)
    const body = new Mesh(
      this.own(
        new ExtrudeGeometry(roundedRectShape(0.46, 0.34, 0.06), {
          depth: 0.06,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.03,
          bevelSegments: 3,
        }),
      ),
      lockMaterial,
    )
    body.position.set(0, -0.12, 0.14)
    const shackle = new Mesh(
      this.own(new TorusGeometry(0.15, 0.035, 12, 32, Math.PI)),
      lockMaterial,
    )
    shackle.position.set(0, 0.05, 0.17)
    this.materials.push(shieldMaterial, lockMaterial)

    this.lattice = new LineSegments(
      this.own(new EdgesGeometry(this.own(new IcosahedronGeometry(1.45, 1)))),
      this.own(
        new LineBasicMaterial({
          color: new Color().copy(sceneColors.teal).multiplyScalar(0.35),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    )
    // The flaws found and fixed: points on the lattice flickering ember, settling to calm.
    const spots: number[] = []
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(Math.random() * 2 - 1)
      spots.push(
        Math.sin(b) * Math.cos(a) * 1.45,
        Math.cos(b) * 1.45,
        Math.sin(b) * Math.sin(a) * 1.45,
      )
    }
    this.flaws = this.dots(spots, [sceneColors.ember, sceneColors.warm, sceneColors.glow], 70)
    this.group.add(this.lattice, this.flaws, shield, body, shackle)
    this.group.position.set(0.7, 0.25, 0)
    this.group.scale.setScalar(0.85)
    this.scene.add(this.group)
    this.camera.position.set(0, 0, 4.4)
    this.camera.lookAt(0.3, 0.1, 0)
  }

  update(time: number) {
    this.group.rotation.y = Math.sin(time * 0.35) * 0.45
    this.group.rotation.x = Math.sin(time * 0.21) * 0.12
    this.lattice.rotation.y = time * 0.15
    this.flaws.rotation.y = time * 0.15
    const uniforms = (this.flaws.material as ShaderMaterial).uniforms
    uniforms.uTime!.value = time
    this.materials.forEach((material) => (material.uniforms.uTime!.value = time))
  }
}
