import { SceneLoader } from '@/components/canvas/SceneLoader'
import { TopBar } from '@/components/layout/TopBar'
import { SmoothScroll } from '@/components/scroll/SmoothScroll'

/** The site: the 3D world behind the page and the small UI over it. */
export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SmoothScroll />
      <SceneLoader />
      <TopBar />
      {children}
    </>
  )
}
