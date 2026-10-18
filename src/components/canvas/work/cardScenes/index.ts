import type { CardScene } from './CardScene'
import { CampaignBars } from './CampaignBars'
import { DeviceGrid } from './DeviceGrid'
import { GlobeRoutes } from './GlobeRoutes'
import { MiniWorld } from './MiniWorld'
import { ShieldLattice } from './ShieldLattice'

export type { CardScene }

/**
 * The live scene for a job whose real work is confidential (or, for Freelance, is this
 * site); null for the jobs that show their own images (Bliggit, the capstone). `detail`
 * multiplies the particle counts (the offline loops render with more).
 */
export function createCardScene(slug: string, detail = 1): CardScene | null {
  switch (slug) {
    case 'kuehne-nagel':
      return new GlobeRoutes(detail)
    case 'eon':
      return new DeviceGrid()
    case 'adesso':
      return new ShieldLattice()
    case 'licht-und-schatten':
      return new CampaignBars(detail)
    case 'freelance':
      return new MiniWorld(detail)
    default:
      return null
  }
}
