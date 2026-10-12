import { SceneLoader } from '@/components/canvas/SceneLoader'
import { TopBar } from '@/components/layout/TopBar'

/** The site: the 3D world behind the page and the small UI over it. */
export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SceneLoader />
      <TopBar />
      {children}
    </>
  )
}
