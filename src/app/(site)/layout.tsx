import { SceneLoader } from '@/components/canvas/SceneLoader'
import { PersonSchema } from '@/components/layout/PersonSchema'
import { Preloader } from '@/components/layout/Preloader'
import { SoundBridge } from '@/components/layout/SoundBridge'
import { TopBar } from '@/components/layout/TopBar'
import { Cursor } from '@/components/ui/Cursor'
import { SmoothScroll } from '@/components/scroll/SmoothScroll'

/** The site: the 3D world behind the page and the small UI over it. */
export default function SiteLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <PersonSchema />
      <SmoothScroll />
      <SceneLoader />
      <TopBar />
      {children}
      <Cursor />
      <Preloader />
      <SoundBridge />
    </>
  )
}
