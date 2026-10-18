# Polish progress

Autonomous polish run (2026-10-14). Each step: production build, FPS at Retina (DPR 2,
1440×900, Intel HD 630, headless Chrome + Metal), compare with `docs/reference/`, commit,
push. Budget: every scene ≥ 55 fps.

Dev helpers: `window.__journey.getState().jump(progress)` (dev only) flies to any point
(0 hero, 1 statement, 2–3 Work cards, 4 System, 5 Depth, 6 Contact, 7 loop).

Already done before this run: polish 1 (motion system), 2 (one grade), 2b (vivid
materials, Contact warm moment), 3 (light on glass, `5c13529`).

## Step 1 — Card frost
- `frost.frag`: cast/rippled glass instead of blur. Slanted ripple streaks + small warped,
  crinkled cells that each shift the image, smear taps along the streaks, per-channel
  dispersion (fringes at fragment edges), milky grey-green tint, light on ripple crests.
  The open card still defrosts to the sharp image.
- `cardFace.ts`: the placeholder is now a generated mock app screen (status bar, header,
  media tile, cards, button, chart, list rows; generic labels only).
- `layout.ts`: per-card rest `face`; cards 2, 4, 6 stay turned along the spiral so their
  lit side walls show.
- FPS (prod, Retina): Work 60.1, Depth 60.1.
- Sheet: `docs/screens/polish-4-frost.jpg`.

## Step 2 — Atmosphere layers
- `journey/Atmosphere.tsx` + `shaders/atmosphere.vert/.frag`: three point layers wrapped in
  boxes that travel with the camera (each mote anchored in the world, so the camera moves
  past them with parallax). Foreground: ~200 large out-of-focus discs near the lens. Mid:
  1800 small vivid bokeh in 22 loose clouds between camera and subject. Background: 2600
  tiny distant motes. Focus follows the camera's orbit distance; hue ramp from the palette
  pulled to each place's accent (teal → violet → blue → emerald → warm). Thinned over the
  HTML text zones (desktop left column, phone bottom). Hero stays sparse (35% presence).
- FPS (prod, Retina): hero 58.4, statement 59.6, Work 60.2, System 60.2, Depth 60.2,
  Contact 60.2.
- Sheet: `docs/screens/polish-5-atmosphere.jpg`.

## Step 3 — Transitions as events
- `journey/ParticleWall.tsx`: a dense, clumpy, tilted disc of dust (18k motes, rejection-
  sampled against cloudy noise) across the path at each transition; it builds as the
  camera nears, peaks as it flies through, and sweeps across the frame as a diagonal.
  One colour per transition: violet (→ Work, y −26), blue (→ System, −47.5), emerald
  (→ Depth, −65), ember/warm (→ Contact, −94). The statement keeps its slab.
- The chip trail after the last card toned down (4200 → 1500 motes, brightness 2.2 → 1.1).
- FPS (prod, Retina) at places: hero 58.4, statement 59.6, Work 59.2, System 60.2, Depth
  60.2, Contact 60.2. During nav flights (1.5s windows): approach 51, Work 48, System 54,
  Depth 60, Contact 58; the same without the walls (51/49/55/60/59), so the walls cost < 1
  fps. **Open:** the dips arriving at Statement and Work predate this run (likely first-use
  shader compiles and Work's mass); see the performance pass.
- Sheet: `docs/screens/polish-6-transitions.jpg`.

## Step 4 — Typography in the scene
- `journey/SceneWord.tsx` + `shaders/sceneWord.frag`: one shared in-world display word
  (texture from `taglineTexture`, additive in the opaque pass so glass refracts it and
  solid forms break it), rising in line by line, with the rare one-line glitch, optional
  water ripple + caustic shimmer, and fit-to-width for phones.
  - Work: "SELECTED WORK" behind the spine on arrival (broken by spine and chips), fades
    by the second card.
  - System: "SYSTEM", huge and dim behind the graph; The Core's glass bends it.
  - Depth: "BENEATH THE INTERFACE" under the surface, wavering; phones: under the panel.
- Contact: `ui/GlitchText.tsx` — "Let's talk" scrambles in on arrival, then every
  2.5–4.5s two slices slip sideways for 0.3s (own colour, no chromatic split on HTML).
  Screen readers get the clean text.
- `useScramble` moved to `src/hooks/` (one scramble implementation for the site).
- FPS (prod, Retina): hero 58.4, statement 59.6, Work 59.0, System 60.2, Depth 60.2,
  Contact 60.2.
- Sheet: `docs/screens/polish-7-typography.jpg`.

## Step 5 — Micro-interactions
- `ui/Cursor.tsx` + `stores/cursor.ts` + CSS in `globals.css`: a ring that follows the
  pointer on the shared UI spring (`MOTION.ui`), around the native cursor (kept for
  accessibility). Modes: card → 72px ring reading "OPEN"; skill node → glow ring; link /
  button → violet dot + arrow; The Core's glass → wobbling ring. HTML targets decide
  first (`data-cursor` overrides), then the 3D scene (cards, nodes, Emblem set the store).
  Fine pointers that can hover only; no lag / wobble with reduced motion.
- `ui/Scramble.tsx`: the one text reveal, built on `useScramble` (now takes a `run` key):
  scrambles on mount, on text change and on hover/focus of its link or button. Used in the
  top bar (name, nav, email), the section indicator, the filter row, Contact links/email.
- The work filter is now real: buttons with `aria-pressed`; jobs outside it dim in the
  list and their 3D cards recede (dimmer, softer) — `work` store `filter`.
- `Magnetic` now uses the shared UI spring; the nav pill is magnetic too.
- Dev note: Turbopack once kept serving a stale error and stale CSS, causing a reload
  loop; `rm -rf .next/dev` and restart fixed it.
- FPS (prod, Retina): hero 58.2, statement 59.6, Work 60.2, System 60.2, Depth 60.2,
  Contact 60.2.
- Sheet: `docs/screens/polish-8-cursor.jpg`.

## Step 6 — Live 3D scenes inside the cards
- `work/cardScenes/`: `CardScene` base (768×480 render target, MSAA 2, own backdrop with
  small corner bleeds, glass-rim material, twinkling dots, async precompile) and five
  original scenes: `GlobeRoutes` (Kühne+Nagel: pulses travelling along routes over a dark
  globe), `DeviceGrid` (E.ON: a fleet of devices with update waves rippling across),
  `ShieldLattice` (Adesso: glass shield + lock in a turning lattice, flaws flickering),
  `CampaignBars` (Licht & Schatten: data particles arcing into growing bars), `MiniWorld`
  (Freelance: a tiny Core in its dust). Shaders in `shaders/cardScenes/`.
- `WorkCards`: confidential jobs + Freelance use the live texture (screen and dissolve
  dust); Bliggit and the capstone keep the image slot (cover or mock app screen). A scene
  renders only when its card is in the frustum and its place visible, every other frame at
  rest (staggered), every frame when focused/open. `frost.frag` darkens the title area for
  live textures (`uShade`).
- Gotcha: the post stack disables `autoClear`; the target must be cleared explicitly.
- Perf: Work's DPR cap 1.5 → 1.4 (the dip between cards 2–3 predates this step: 54.7
  without live scenes). FPS (prod, Retina): Work down the cards 60.3 at every step; hero
  58.2, statement 59.8, System/Depth/Contact 60.2. **Open:** arrival flight into Work
  still dips (~43–45 for 1.5s, same without live scenes).
- Sheet: `docs/screens/polish-9-live-cards.jpg`.

## Step 7 — Sound
- `lib/sound/engine.ts` (Web Audio, synthesised, no files) + `lib/sound/beds.ts`: one
  ambient bed per place (detuned soft tones through a breathing low-pass, a little brown
  noise for air; Depth muffled, Contact warm), crossfaded by journey progress (the loop
  flows back into the hero's bed). Interaction sounds: hover tick, card open (rising air +
  soft bell), close (falling air), nav flight (long low rush). Master 0.14 through a
  compressor, 1.2s fades. Reduced motion: no ticks, slower swells.
- Toggle: the nav's signal bars are now the sound button (`aria-pressed`, "Sound"): flat
  and grey when off (default), live when on. `stores/sound.ts` remembers the choice in
  localStorage; a remembered "on" resumes on the first gesture (`SoundBridge`).
- Triggers: `SoundBridge` (journey, work open/close, 3D hover), `Cursor` (HTML hover
  ticks), `SmoothScroll` (nav flights).
- Verified: off by default; click → context running, master 0.14, hero bed 0.84;
  reload → restored; off → fades to 0. No GPU cost (FPS unchanged).

## Step 8 — Preloader
- `stores/loading.ts`: four real steps (fonts, scene mounted, `/assets.json`, the first
  scene's shaders compiled via `compileAsync` in `hero/Warmup.tsx`), performance marks
  `signal:<step>` / `signal:reveal`.
- `layout/Preloader.tsx`: small mono counter 000 → 100 + 1px line under where The Core
  appears; never ahead of real progress (max 160%/s so it reads as a count); at 100 the
  reveal starts and the counter fades. Skipped on repeat visits (sessionStorage
  `signal-intro`); 5s safety timeout. Name and role are HTML from the first paint
  (FCP ≈ 0.1s).
- `hero/IntroBurst.tsx` + `shaders/introBurst.*`: 2200 motes scattered in the dark
  condense onto The Core's outline (and its inner ring), flare, and fade as The Core
  scales in, turning (`Emblem` reveal). Reduced motion: no burst, a short scale-in.
- Load time cuts (to hit ~1.8s): the procedural spine (~0.6s) now builds in a Web Worker
  (`work/spine.worker.ts`); particle walls sample a 64² density table instead of
  rejection-sampling noise (~0.27s → negligible); shader error checks off in production
  (sync program-log reads). Reveal at 1.4–2.1s (was 2.9–3.6s) at Retina, headless.
- Sheet: `docs/screens/polish-10-preloader.jpg`.

## Step 9 — Build completion
**Critical finding:** R3F requests `powerPreference: 'high-performance'` by default, so on
this dual-GPU MacBook Chrome rendered on the **AMD Radeon Pro 560**, not the Intel HD 630.
Every FPS number before this point (this run and earlier sessions) was the AMD GPU. Forced
onto the HD 630 (`--force_low_power_gpu`) the site ran: hero 53.8, statement 31, Work 33–38,
System 59, Depth 47, Contact 47.
- Fix: an adaptive **tier** (`stores/tier.ts`). Everyone starts on `full`; the
  PerformanceMonitor (bounds 55–70 fps) drops the visit to `lite` once if it measures below
  55. Lite: The Core keeps its glass without the refraction pass (`reflectOnly`), bloom at
  ¼ res / 4 levels, DPR ≤ 1 (`LITE_MAX_DPR`), card frost 2 taps, card blocks without thin
  film / clear coat, live card scenes every 3rd frame, spine coarser (tessellation edge
  0.24, built in the worker) and its oil without per-pixel grain / roughness noise / film.
- For everyone: card frost relief baked once per card (`work/frostField.ts`,
  `shaders/frostField.frag`; was ~8 noise evaluations per pixel), bloom at ½ res, MSAA
  decided by the device DPR (a lowered DPR no longer switches it on), transmission pass at
  0.35 res.
- Production keeps `powerPreference: 'high-performance'` (your approved look on the AMD,
  dual-GPU laptops); integrated-only machines get the lite tier by measurement.
- FPS (prod, Retina): **HD 630 (lite):** hero 56.4, statement 58.8, Work 60.2 (60.3 at every
  card), System/Depth/Contact 60.2. **AMD (full):** hero 58.6, statement 59.6, Work 60.2
  (60.3 every card), System/Depth/Contact 60.2.
- Load: staged mounting (`canvas/Deferred.tsx`: hero first, then one place per idle
  callback, all at once when the visitor moves), no frames until shaders are compiled
  async (`SceneCanvas` frameloop), WebGL fallback detection skips software renderers.
- SEO: `lib/siteUrl.ts` (NEXT_PUBLIC_SITE_URL or Vercel's production URL), full metadata
  (OG/Twitter/canonical/robots), `sitemap.ts`, `robots.ts` (disallow /lab), Person JSON-LD
  (`layout/PersonSchema.tsx`). Brand images rendered from a real frame of The Core by
  `npm run brand:images` (`scripts/brand-images.mjs`): opengraph/twitter (1200×630),
  apple-icon, favicon.ico (from the new `app/icon.svg`; the default Next.js icon is gone).
- 404: `app/not-found.tsx` ("Signal lost", glitching, static world, way back).
- No WebGL / software GL / context failure: `canvas/StaticWorld.tsx` + `ui/CoreMark.tsx`
  (CSS corner bleeds + a turning glass-like Core ring), error boundary in `SceneLoader`.
- Mobile: short phones (≤760px tall) lift the statement (tagline + Core) clear of the text,
  hide Depth's 3D words (the HTML heading says the same), "SYSTEM" fainter on phones.
  Checked 390×844 and 375×667 at every place.
- Reduced motion: checked at every place (calm, static Core face-on, no glitches/burst).
- Lighthouse (desktop, prod, local): Accessibility 100, Best Practices 100, SEO 100.
  Performance **67** on this dual-GPU Mac (waking the AMD GPU blocks ~0.6s), **79** with the
  integrated GPU (TBT ~450 ms, FCP 0.3s, LCP 0.6s, CLS 0). **Open:** reach ≥ 90 — split the
  remaining scene-construction tasks (Work's cards / card faces / live scenes per idle
  chunk), consider `low-power` on battery.
- Sheets: `docs/screens/polish-12-lite-tier.jpg`, `polish-12-404-nowebgl.jpg`.

## Step 10 — Final self-review
- Full journey recorded with the mouse wheel in production (56 frames, 1s apart): hero →
  statement → Form → Work (6 cards) → System → Depth → Contact → loop → hero again, no gaps
  from the staged mounting. Sheet: `docs/screens/polish-13-journey.jpg`; next to the
  reference strips: `docs/screens/polish-13-reference-vs-ours.jpg`.
- Fixed: at the start of the loop The Core crossed the still-visible "Let's talk"; the
  Contact HTML now hides a little earlier (`SHOWN.contact` ends at 6.2).

### Open for later (the 5 biggest differences vs the reference)
1. **Card media.** Their cards carry bright, full-bleed photographic / video media that fill
   the glass; ours carry mock screens and abstract live scenes, darker and smaller in the
   frame. Biggest lift: real covers in `public/work/<slug>/cover.webp` (Bliggit, capstone)
   and possibly brighter live scenes.
2. **Scale and density at Work.** Their cards and the column fill the frame, overlap and
   cut the edges; the column is a lit, iridescent sculpted mass wrapped in dense particle
   clouds. Ours: a darker procedural spine (waiting for `public/models/spine.glb`), cards
   smaller in frame.
3. **Foreground objects.** Their frames have big glass panels passing close to the lens,
   cut by the frame; ours have out-of-focus bokeh only (step 2). Next: one or two
   out-of-focus glass shards near the camera per place.
4. **Mid-tone lift at Work.** Their Work frames sit brighter (purple haze over the column);
   ours are darker. Needs a careful pass against the approved grade.
5. **Performance headroom.** Lighthouse Performance 67–79 (target 90): scene construction
   still blocks ~0.45s; on integrated-only GPUs the lite tier drops The Core's refraction
   (the statement tagline is no longer bent by the glass there).

---
# Round 2 (2026-10-14)

## Part 1 — Site address
- `lib/siteUrl.ts`: NEXT_PUBLIC_SITE_URL, else `https://riadhsouissi.vercel.app` (never a
  preview or localhost URL). Verified in the production build: canonical, og:url and
  og:image on `/`, `/cv`, `/work/<slug>`; sitemap `<loc>`s; robots `Sitemap:` line.
- `lib/ogImage.ts`: pages with their own `openGraph` (cv, work) list the shared image
  (a page-level openGraph replaces the inherited one, dropping og:image).

## Part 2 — Load performance
- Still `powerPreference: 'high-performance'`. The ~0.6s GPU wake now happens in a Web
  Worker (`canvas/gpuWarm.worker.ts`, OffscreenCanvas context on the discrete GPU); the
  page's own context then takes ~7ms. `SceneLoader` waits for the worker (max 2s), mounts
  the canvas, releases the worker's context 5s later.
- The HTML hero (name, role, tagline, email) paints first (FCP 0.3s); the 3D builds behind
  it and fades in (preloader counter → reveal).
- `Deferred` is now lazy: Work, System, Depth/Contact, the transitions and the gold cloud are
  built only after the visitor's first scroll / key / touch / pointer move (one per idle
  moment), or at once when they leave the hero.
- Lighthouse (desktop, prod, AMD/high-performance): **Performance 92** (was 67),
  Accessibility 100, Best Practices 100, SEO 100. TBT 180–190 ms, LCP 0.5s, CLS 0.
- FPS (prod, Retina): AMD full — hero 58.2, statement 60.2, Work/System/Depth/Contact 60.2.
  HD 630 lite — hero 57.0, statement 56.0, Work 60.2, System 60.2, Depth 59.4, Contact 60.2.

## Round 2, session 2
- Interrupted session left the part-3 CV work uncommitted (`src/app/cv/page.tsx`,
  `src/content/site.ts`, the regenerated PDF): stashed as
  `stash@{0} round2-part3-cv (interrupted session)`, to be popped for the CV part.

## Part "Spine" — procedural rebuild (no spine-raw.glb present)
- `work/spineGeometry.ts` rewritten after `docs/spine-concept.png` (built in the worker):
  14 fused vertebrae, each a thick rounded-square body of its own size, tilt and turn, the
  column wobbling off the axis; bodies tessellated + carved + faceted (crystal chips);
  smooth oily collars at the seams; 1–2 wings per vertebra, swept tapered blades of
  lens-shaped section, varied (long, short, curled tips, broken ends); drips (lathe
  strands with a bead) under some wings. One merged mesh with an `oilSmooth` attribute.
- `oilMaterial.ts`: `oilSmooth` keeps wings / collars / drips wet and near-mirror, puts the
  iridescent streaks and stronger glow on them, and the grain / chips on the bodies only.
  The lite tier still drops grain, film and clear coat (coarser body tessellation).
- FPS (prod, Retina) down the Work cards: AMD full 60.3 at every card; HD 630 lite 60.3.
- Sheet: `docs/screens/round2-spine.jpg` (concept, reference column, ours, lite).
- Open: the column reads darker than the studio-lit concept (part 2's mid-tone lift).

## Part "Work composition"
- Camera closer: `WORK.distance` 7.8 → 6.6, so the focused card fills ~45–55% of the frame.
- `layout.ts`: cards 2, 4, 6 hang left and high (`left` flag), overlapping the right
  cards behind the column; `path.cardY` aims the camera 0.5 below them so they clear the
  HTML list at the bottom left.
- `work/WorkHaze.tsx`: a tall violet haze behind the column following the camera (glow
  shader, additive, opacity 0.22): the mid-tone lift, without touching the shared grade.
- `work/LensShards.tsx` + `shaders/lensShard.frag`: out-of-focus glass panels just in
  front of each card stop, cut by the frame (desktop). **Open:** they read too faintly in
  the captures; raise opacity / size or move closer next time.
- Card media: saturation ×1.35 under the frost, milk 0.38 → 0.27, rest brightness 0.8 → 1.0
  (both tiers). Edge chip clouds per card 560 → 900.
- Atmosphere foreground: big bokeh discs → 420 small sharp coloured particles
  (size 0.012, max 9px).
- Fix: the frost reliefs bake inside the render loop (baked from a mount effect, the first
  card's came out blank, i.e. no frost).
- FPS (prod, Retina): AMD full — hero 60.2, statement 57.4, Work 60.3 at every card,
  System/Depth/Contact 60.2. HD 630 lite — hero 57.4, statement 57.0, Work 60.0–60.3,
  System/Depth/Contact 60.2.
- Sheet: `docs/screens/round2-work-composition.jpg` (reference, before, after, lite).

## Part "CV page" (restored from the stash)
- `content/site.ts`: per-job `dates`, `location`, `details` (Bliggit, E.ON, Licht &
  Schatten, from the CV); `cv` block with language levels, the B.Sc. (Monastir, 2014) and
  extra skill groups (state & data, React performance, back end, design & UI, tooling).
- `app/cv/page.tsx`: dates · location per job, detail bullets, languages with levels,
  extra skill rows, the B.Sc. under Education. No phone number.
- PDF regenerated (`node scripts/cv-pdf.mjs <url>`): `public/cv/riadh-souissi-cv.pdf`.
- Print view: `docs/screens/round2-cv.png`.

## Part "Legal pages"
- `/impressum` and `/datenschutz` (`components/legal/LegalPage.tsx`, static world + mono
  text), placeholders for the full texts. Datenschutz states: no cookies, no tracking or
  analytics, self-hosted fonts, no third-party content; two technical settings in local /
  session storage (sound on/off, intro shown); hosting by Vercel, which processes server
  logs. Linked bottom right in Contact; both in the sitemap.
- Lighthouse (desktop, prod): Performance 91, Accessibility 100, Best Practices 100,
  SEO 100. Contact FPS 60.1.
- Sheet: `docs/screens/round2-legal.jpg`.

## Next session
- Lens shards (Work) read too faintly: raise opacity / size or bring them closer.
- The spine reads darker than the studio-lit concept; a real model would help most
  (`public/models/spine-raw.glb` → clean / decimate / Draco + KTX2 → `spine.glb`).
- Fill in the Impressum and Datenschutz texts.

---
# Round 3 (2026-10-14)

## Part A — Work scene rework
- Orbit: `SPIRAL` 0.5 → 5/6 turn; the camera circles the column (one card every 60°) while
  descending; scroll drives the angle. `WORK.x` 0 (column centred, orbit centre),
  `WORK.distance` 6.6 → 7.2. Cards sit at radius ~2.6, ±0.72–0.78 rad beside the camera's
  line (alternating right / left), so the focused card is ~40% of the frame and overlaps
  the column only at its edge; the neighbours appear smaller round the column. Leaving
  Work (to System / Depth) eases to the nearest whole turn; `CameraRig` unwraps whole
  turns (no spin on the loop back to the top).
- Card glass restored: milk 0.36, saturation ×1.2, rest brightness 0.88, cursor tilt 0.12.
- Chips are now instanced faceted glass shards (`shaders/glassChip.*`, `Pebbles.tsx`:
  octahedron stretched per chip, tumbling, dark tinted body, bright rims, iridescent
  glints); soft and translucent near the lens and far away, crisp at the focus. Loose
  chips in empty space 25% → 6%.
- Lens shards bigger (1.3 × 0.85) and ~2× brighter. Spine: envMapIntensity 0.95 → 1.35,
  oil glow 0.45 → 0.7.
- FPS (prod, Retina): AMD full — hero 60.2, statement 58.8, Work 60.3 at every card,
  System/Depth/Contact 60.2. HD 630 lite — hero 57.6, statement 56.2, Work 60.3,
  System/Depth/Contact 60.2.
- Strip: `docs/screens/round3-work-orbit.jpg` (seg_44 above, our Work scroll below).
- Open: the lens shards still read faintly; the spine is still darker than the concept.

## Part B — Bliggit cover
- The two files' contents were swapped (cover.png showed the login, login.png the home
  screen): renamed so `cover.png` = home screen, `login.png` = login (both are WebP data
  with a .png name; browsers handle it).
- `cardFace.setCover`: portrait screenshots are drawn whole, right of centre, over a
  blurred, darkened enlargement of themselves (landscape covers still cover-fit).
- `Job.gallery` (+ `JobDetail`): the login screen shows in the opened card's details;
  `Job.repo` adds a "Repository on GitHub" link (used by the capstone).
- The 3D "SELECTED WORK" hides while a card is open (it sat behind the details).
- Sheet: `docs/screens/round3-bliggit.jpg`.

## Part C — Capstone "AI × Work"
- `public/work/capstone/aiwork_medallion.svg` copied from the repo (explicit 1320×720 size
  added to our copy so canvases draw it right); `Job.coverFile` lets a cover keep its own
  name (`assets.json` checks it first). SVG covers are drawn whole on the dark screen.
- `capstone` in `content/site.ts`: name, one-liner, stack (Python, dbt, PostgreSQL (Neon),
  Cloudflare R2, Apache Airflow, Docker, Streamlit, Plotly), repo link, card title
  "AI × WORK / BRONZE → GOLD". The "Capstone project" placeholders are gone.
- Depth HTML panel: capstone name, one-liner, stack and "Repository on GitHub"; on phones
  the two stack lines are screen-reader-only so the 3D panel stays clear.
- Sheet: `docs/screens/round3-capstone.jpg`.

## Part D — Mock screens
- `cardFace.drawPlaceholder`: tones mixed 45% towards the background, 5 soft blobs (was 18),
  softer highlights. Only a fallback now (Bliggit and the capstone have real media, the
  other jobs live scenes). `mix()` returns hex so mixes chain.

## Part E — CV
- `Job.cvSummary`: Freelance on /cv reads "Three.js, WebGL / GLSL shaders and GSAP: a 3D
  product portfolio with custom interactions." (the site keeps the longer line).
- Education: "Capstone: AI × Work" with its one-liner, stack and repo link under the
  Data Engineering Programme. PDF regenerated.

## Part F — Impressum
- `/impressum`: the given text (Angaben gemäß § 5 DDG, address, Kontakt with e-mail and
  phone, Verantwortlich für den Inhalt). The phone number lives only in
  `app/impressum/page.tsx`; verified absent from /, /cv, /datenschutz, /work/* and the PDF.
- `/datenschutz`: "Verantwortlich" with the same name and address
  (`content/legal.ts`, no phone).

## Round 3 wrap-up
- Load: the atmosphere layers now mount in the first idle moment after the canvas starts
  (`Soon` in `Deferred.tsx`), splitting the hero's mount task. Lighthouse (desktop, prod):
  Performance 91–92, Accessibility 100, Best Practices 100, SEO 100.
- FPS (prod, Retina): AMD full — hero 59.4, statement 60.2, Work 60.2 (60.3 every card),
  System/Depth/Contact 60.2. HD 630 lite — hero 56.6, statement 56.8, Work 60.2,
  System/Depth/Contact 60.2.

## Next session
- Lens shards still read faintly in captures; the spine is still darker than the concept.
- A real spine model would help most (`public/models/spine-raw.glb`).
- Bliggit's cover.png / login.png were swapped to match their contents: check.

---
# Round 4 (2026-10-15)
- Cards as thin glass panes: `BLOCK` 0.24/0.08 → 0.06/0.02, corner radius 0.2 → 0.1, lighter
  glass body, brighter, wider edge line; the frosted media fills the pane edge to edge.
  Media brighter (milk 0.26, saturation ×1.3, rest brightness 1.05).
- Spine lighter and calmer: lilac body (violet/glass mix), metalness 0.75; wings shorter
  (long 0.95–1.4, short 0.45–0.8), flatter (section 0.16), gentler sweep.
- Particles: the per-card corner chip clusters are gone; the glass chips drift in 14 loose
  clouds round the column and between the cards (pebbles radius 1.15, hug 0.35, clouds
  45%).
- Capstone card: title "AI × WORK", subtitle "CAPSTONE · BRONZE → GOLD" (`cardTitle`,
  `cardSubtitle`). Cover: kept the medallion; `aiwork_concept.svg` is a light, emoji-heavy
  sheet that glares on dark glass.
- Lens shards: the shader never compiled (`half` is a reserved word in GLSL), so they had
  never shown. Fixed; one soft out-of-focus pane per stop, only near the frame's left /
  right edge (fades by projected x and when the lens is within ~1.1 units), blur kept
  inside the plane. Cards passing right by the lens between stops fade too.
- FPS (prod, Retina): AMD full — hero 60.2, statement 58.6, Work 60.3 every card,
  System/Depth/Contact 60.2. HD 630 lite — hero 57.4, statement 56.0, Work 60.3,
  System/Depth/Contact 60.2.
- Strip: `docs/screens/round4-work.jpg` (seg_44 above, ours below).

---
# Final art-direction pass (2026-10-15)

## Hero — "mystery"
- The Core 1.5× at the hero, slightly above centre (pose y 0.15 → 0.45); the statement
  keeps its size; at Contact it returns to base size and grows back over the loop (the
  looped view still matches the hero). Intro burst outline scaled to match.
- `hero/HeroAura.tsx`: a soft teal halo behind it breathing every ~6s, and 70 glass chips
  orbiting it at different depths (`ChipCluster`), hero only (and the loop's return).
- Sheet: `docs/screens/final-hero.jpg`.

## Statement exit + descent — "clarity → transformation"
- `tagline.frag` `uExit`: as the camera leaves (toWork 0 → 0.3) each line breaks up in small
  cells, top line first; `shaders/taglineDust.*` + `createDust` in `Tagline.tsx`: 5000
  motes sampled from the tagline texture's own pixels, released with their line, falling
  with the camera and drifting apart, fading as they reach the descent's dust.
- `Emblem`: leaving the statement it follows the camera down (80%) and shrinks to 6% (a
  small edge-on sliver of light) instead of being cut off by the top edge.
- The dust leads straight into the wireframe (no dark frames). The wireframe's own
  assemble / hold / scatter was kept.
- Sheet: `docs/screens/final-statement-exit.jpg`.

## Work — "richness and pride"
- Camera 7.2 → 6.8 (focused card ~45%, the next one beside it, the column between).
- Spine: deep purple-lilac jewel (violet, 12% glass, ×0.22; metalness 0.85).
- Cards: a glint travels round each pane's edge (`uTime` in the block shader); the relief
  shift is 0.6× so the media read through the frost; hover = a soft defrost spot under the
  cursor (`uCursor`, `uHover`, uv from pointer moves); opened = one soft light band sweeps
  across once the image is sharp (`uSweep`).
- Bliggit: the screenshot as a phone (dark rounded bezel) filling 90% of the pane height.
- Background: at Work the lower-left bleed turns dark teal; the purple stays in the glow
  round the column.
- FPS (prod, Retina) down the cards: AMD 60.3, HD 630 lite 60.3.
- Sheet: `docs/screens/final-work.jpg` (seg_44 above).

## System — "intelligence and connection"
- "SYSTEM" moved fully above the constellation (desktop: [-1, 5.3, -4], height 2.2),
  billboarded (`SceneWord billboard`) so the camera's swing never sees it at a slant;
  camera 14 → 16.5 to make room. Never behind a label now.
- Livelier: the camera's drift round the graph 0.07 → 0.12 rad/s, ±0.6 rad; filament
  pulses leave more often (0.35 → 0.45).
- Open: the word's rise-in / glitch is often caught mid-way in captures; the transition
  from Work (chips gathering into the first nodes) was not built (the blue particle wall
  carries it).
- Sheet: `docs/screens/final-system.jpg`.

## Depth — "calm curiosity"
- Capstone media: only the bronze → silver → gold flow of the medallion, larger
  (`Job.coverCrop`, drawn on the dark screen). No dashboard.png yet (drop it in
  `public/work/capstone/` and set `coverFile` to use it).
- Light shafts sway slowly (`shaft.vert`); `depth/DepthBubbles.tsx`: 70 ring-lit bubbles
  rising and wobbling.
- Dev note: `/assets.json` can be cached by the dev server (it showed the capstone cover
  as null); the production build is right.
- Sheet: `docs/screens/final-depth.jpg`.

## Contact — "warmth and arrival"
- `Emblem`: at Contact The Core turns face-on to the visitor (eases back to its own turn
  over the loop). `journey/ContactEmbers.tsx`: 40 warm embers rising round it with the
  warm moment.
- `ui/EmailButton.tsx`: magnetic, warm glow on hover / focus, a ring of light ripples out
  on click (none with reduced motion).
- Sheet: `docs/screens/final-contact.jpg`.

## Loop, phones, final checks
- Loop: The Core grows back to hero size only after Contact's text has gone (it covered
  "LET'S TALK" at the start of the loop). Wheel and trackpad runs: no blank frame, no jump.
- Phones (390×844, 375×667): every place checked; System's 3D word is off on phones (no
  clear space above the graph; the HTML heading carries it).
- Perf guards: hero DPR cap 1.4 → 1.25 (The Core at 1.5× costs more refractive pixels);
  lite tier: dust-slab smoke field updates every other frame, one smoke layer; tagline
  dust 2500 motes.
- FPS (prod, Retina, measured after arriving by nav): AMD full — hero 59.8, statement
  60.2, Work 60.2 (60.3 every card), System/Depth/Contact 60.2. HD 630 lite — hero 56.6,
  statement 56.6, Work 60.2, System/Depth/Contact 60.2.
- Lighthouse (desktop, prod): Performance 92, Accessibility 100, Best Practices 100, SEO 100.
- Full-journey strip: `docs/screens/final-journey.jpg`.

## Next session (open)
- **HD 630, idle hero:** with no interaction the hero swings 38–58 fps over time on the
  integrated GPU (lite tier engaged, DPR 1). The previous round's build does the same, so
  it isn't new; measured after a nav flight it holds 56–59. Investigate (The Core's
  face-on angle vs edge-on? GPU power state?) with a frame-time trace.
- System: the transition where Work's chips gather into the first nodes was not built;
  hover propagation "in sequence" + the "used at" scramble not reworked.
- Wireframe: no extra glow pulse / shatter into Work's chip clouds (its own scatter kept).
- Craft: cursor labels ("EXPLORE"), sound tone shift between places and a glass "tink" on
  open were not done in this pass.
- Depth: a real dashboard screenshot (`public/work/capstone/dashboard.png`) would read
  better than the medal flow.

---
# Design + cleanup round (2026-10-15)

## Part 1 — Idle hero performance (fixed)
- Cause (found with temporary per-subsystem probes on the HD 630): not The Core's shading,
  refraction or angle, but the hero's **warm light pulse**: every 6–10s the environment
  cube map re-rendered (and re-filtered) every frame of the pulse. With The Core absent
  nothing sampled it, which is why removing The Core "fixed" it.
- Fix: environment resolution 256 → 128 (both tiers; reflections look the same, the
  light-formers are soft), and no hero warm pulse in the lite tier (Contact's warmth stays).
- Idle hero, 60s, prod, Retina: HD 630 lite 60.2 in every 5s window after the first
  (tier switch); AMD full 60.2 in every window (was 53–59).

## Part 2 — Particles as glass grains
- Chips (`glassChip.vert/.frag`): varied crystals per instance (long shards, flat flakes,
  near-cubic grains), mostly tiny (×0.45–2.0), stronger glint, gold in the thin-film
  fringe; 11000 round the column (was 7000).
- Point particles: `shaders/grain.frag` (tiny faceted diamond: four lit faces, bright rim,
  hot glint; soft small disc only far out of focus) for the transition walls, trails and
  Depth plankton; `atmosphere.frag` the same crystal (fore max 6px, mid 7px: the round
  bokeh blobs are gone); Contact embers as warm grains (`ember.frag`); hero orbit grains
  larger (×2.4) and 90 of them. `ChipCluster` takes a `palette`.
- FPS (prod, Retina) down the Work cards: AMD 60.3; HD 630 lite 60.0–60.3.
- Sheets: `docs/screens/round5-grains.jpg` (seg_44 above), `round5-grains-detail.jpg`.

## Part 3 — Work: dolly-in, cards, spine, light
- `path.ts`: orbit → approach → hold → release. Near each card's stop the camera dollies
  in by `WORK.dolly` (1.3) with an eased hold window (±0.42 of a card), and aims a little
  towards the focused card (`aim`, spring in `CameraRig`; 0.22). The focused card fills
  ~55% of the frame with the column at its edge; between stops the camera eases out while
  orbiting. Lens shards follow the held distance.
- The card at the stop leans 45% further towards the camera (`atStop` in `WorkCards`).
- Spine: inner glitter (sparse twinkling points inside the bodies, not the wings), wing /
  collar iridescence ×2.2. Grain clouds wrap the column (Part 2).
- Light: purple glow round the column (WorkHaze) and dark teal elsewhere (from the final
  pass); unchanged here.
- FPS (prod, Retina) down the cards: AMD 60.3; HD 630 lite 60.3.
- Strip: `docs/screens/round5-work-dolly.jpg` (seg_44 above).

## Part 4 — Depth: darker, richer colour
- `depth/depthPalette.ts`: all Depth colours in one place (gems / lattice / roots a deep dark
  emerald, aqua only at tips and pulses, water much darker, caustics pale aqua-white,
  backdrop almost black at the bottom; no flat neon green).
- Two variants compared (`docs/screens/round5-depth-variants.jpg`): A "deep emerald",
  B "deep teal-blue". Chose **B**: closer to the reference Lab's cold, dark mood.
- The capstone panel already uses the job cards' glass and lit edge.

## Part 5 — Capstone media
- `public/work/capstone/dashboard.png` (your Streamlit AI-exposure chart) is now the panel
  media: `coverFile: 'dashboard.png'`, `coverCrop` on the bubble cloud only; cover-fit
  now honours crops. The medallion SVG stays in the folder, unused.
- Shot: `docs/screens/round5-capstone-dashboard.png`.

## Part 6 — System
- `SceneWord`: rises in 0.8s, then stays fully readable for 4s before a rare glitch (every
  4–7s, 0.3s). "SYSTEM" lowered (y 5.3 → 4.7) for clear space below the top bar.
- The large blurry blobs were the atmosphere's bokeh discs: now glass grains (Part 2).
  Nodes are the faceted glass gems; filaments keep their travelling pulses.
- Sheet: `docs/screens/round5-system.jpg`.

## Part 7 — Flow and empty frames
- Checked System → water (progress 4.25–4.55) and the loop back to the hero (6.7–6.95):
  the transition now passes through the grain wall into the falling data dust (the grain
  sprites of Part 2 made the old faint trail visible), and the loop keeps The Core in frame
  all the way. No code change needed. Statement exit kept as is.
- Sheet: `docs/screens/round5-flow.jpg`.

## Part 8 — Hero and Contact touches
- Hero: the orbiting chips are now crystal grains, 90 of them at ×2.4, catching the light
  (Part 2). Contact: embers are warm faceted grains (`ember.frag`); face-on Core and warm
  arrival kept.

## Final checks (this round)
- Full journey at normal wheel speed, desktop full tier, desktop lite tier (HD 630) and
  phone 390×844: `docs/screens/final-journey-2.jpg` (three strips, top to bottom).
- Phones: Depth's 3D words are off on every phone now (they doubled the HTML heading at
  390×844).
- FPS (prod, Retina, after arriving by nav): AMD full and HD 630 lite — every place 60.2.
  Idle hero 60s on the HD 630: 60.2 in every 5s window after the first (55.0 while the tier
  switches).
- Lighthouse (desktop, prod): Performance 92, Accessibility 100, Best Practices 100, SEO 100.

## Next session
- Start of the loop: The Core rises through "LET'S TALK" for about a second while the
  Contact text fades (desktop and phone). Fade the text sooner or start the Core's move
  later.
- Freelance card → System: about one second of thin frame (only faint grains).

## Later (nice-to-haves, not started)
- Wireframe glow pulse and shatter into Work's grain clouds.
- Work's chips streaming down into the first skill nodes.
- System hover: connections lighting in sequence, "used at" scramble.
- Cursor label ("EXPLORE"), sound tone shift between places, glass "tink" on open.

---
# Perfectionist round (2026-10-15)

## Part 1 — Grains as glass beads
- Chips are faceted beads (icosahedron detail 1, mostly round, some oval), shaded dark
  body → darker edge → thin iridescent rim → hot glint up-left; per-bead brightness 0.25–1.6
  (few bright, many dim). Point-sprite grains (atmosphere, transitions, Depth plankton,
  embers) share the same bead shading.
- Distribution: ring radius 1.5 (outside the column's surface; at 1.15 many were buried
  inside it), hug 0.75, 2% loose, tight clouds 30% (spread 0.45–0.8), 14000 beads;
  palette pink / violet / teal.
- Hero: grains only behind The Core and at its sides (three clusters), never in front.
- Sheet: `docs/screens/round6-beads.jpg`.

## Part 2 — Background at Work
- `backdrop.frag`: slow two-layer fbm fog (darker charcoal and lighter teal haze drifting
  at different speeds) when at Work; the corner bleeds step back 55% there. Off on the lite
  tier (full-screen noise).
- `WorkHaze` narrowed 10 → 4.6 wide and dimmer (0.16): purple only as a glow hugging the
  column, no flat lavender third of the frame.
- Beads use a 20-face icosahedron (80 faces cost the HD 630 15 fps; at their size they
  read the same).
- FPS (prod, Retina) down the Work cards: AMD 60.3; HD 630 lite 60.3.
- Sheet: `docs/screens/round6-background.jpg`.

## Part 3 — Card media
- Bliggit: `CardFace.drawPhones`: home + login screenshots as two large, slightly angled
  phones in dark bezels with soft shadows, on a deep red → violet → blue gradient (the
  app's colours) with a glow sampled from the screenshot. `clearCover` (lighter frost).
- Live scenes: camera zoom 1.3 (subject bigger), richer card backgrounds (stronger corner
  bleeds, base tinted by the scene's colour), rim glow ×1.5; lighter frost (`uClarity`:
  relief shift −45%, milk −40%).
- Capstone: the dashboard chart with its title and axes (crop [40, 500, 1720, 1118]),
  lighter frost.
- Sheets: `docs/screens/round6-bliggit.jpg`.

## Part 4 — Card typography
- Titles centred over the media, large (fit to 84% width), light, white with a soft glow;
  company small and letter-spaced above; index / years small top-left. On hover the
  scramble shows chromatic doubled letters (pink and teal ghosts) that settle.
- Two options compared (`docs/screens/round6-type-options.jpg`): A Departure Mono (pixel),
  B Martian Mono 300. Chose **B** (thinner, cleaner, closer to the reference's light
  display titles); pixel stays for the small UI and the 3D words.
- FPS (prod, Retina) down the Work cards: AMD 60.3; HD 630 lite 60.3.

## Part 5 — Spine
- One organic mass: bodies 1.25–1.45× the spacing (neighbours overlap and fuse), broader,
  stronger bulges, no collar rings (they drew the seams).
- Wings: shorter (0.35–1.05), most curled, none broken; same lilac oil, roughness 0.28 and a
  lilac sheen (they reflected the dark world as black mirrors before). Nothing black.
- Sheet: `docs/screens/round6-spine.jpg`.

## Part 6 — Glitch discipline
- One rule for "LET'S TALK" (`GlitchText`), "SELECTED WORK" / "SYSTEM" / "BENEATH THE
  INTERFACE" (`SceneWord`) and the tagline (`Tagline`): one glitch as the text settles on
  arrival, then 0.2s every 8–12s (readable well over 95% of the time). The scramble-in on
  arrival (~1.2s) is kept as the reveal.

## Part 7 — Small items
- System: The Core at the centre faces the camera (gentle sway only).
- Depth HTML: heading (small, muted: the 3D words carry it large), one sentence, "Capstone ·
  AI × Work · GitHub ↗", and a `<details>` "Stack" line holding the programme, the data
  stack, the capstone summary and stack (all still in the HTML).
- Loop: Contact's text hides at progress 6.06 (was 6.2), before The Core rises through it.
- After the Freelance card: the chip trail to System 1500 → 3200 grains, brighter.
- Sheet: `docs/screens/round6-system-depth.jpg`.

## Final checks (perfectionist round)
- Full journey at normal wheel speed: desktop full tier, desktop lite tier (HD 630), phone
  390×844 → `docs/screens/final-journey-3.jpg` (three strips).
- FPS (prod, Retina, after arriving by nav): every place 60.2 on both tiers. Idle hero 60s:
  AMD 60.0–60.2 in every window; HD 630 60.2 after the first window (55.4 during the tier
  switch).
- Lighthouse (desktop, prod): Performance 92, Accessibility 100, Best Practices 100, SEO 100.
- Loop: Contact's text is gone before The Core rises (no more overlap).

## What still differs from the reference (honest list)
1. **Sculpted matter (needs art).** Their column and Lab are scanned / sculpted assets with
   fine organic detail; our spine is procedural noise on extruded blocks. Code can't
   close this: a real model (`public/models/spine-raw.glb`, the loader is in place) would.
2. **Card media richness (mostly needs art).** Their cards carry art-directed photography
   and video; ours carry two real screenshots, one dashboard and abstract live scenes for
   confidential work. Better source images or short muted videos per job would close
   most of it; code can only frame them.
3. **Bead clouds (code, partly closed).** Ours now read as glass beads hugging the column,
   but theirs are denser, more varied in size and blur, with real refraction. A depth-
   of-field post pass and per-bead refraction would get closer; both cost GPU.
4. **Thin frames (code).** About a second of sparse frame remains between the last card
   and System, and right after the descent into Depth. More grain density on those legs
   would fix it.
5. **Type (code + font choice).** Their display face is a thin geometric sans; ours is a
   light monospace (Martian Mono 300) to stay within the approved fonts. A licensed thin
   sans would be closer, if you want to add one.
6. **Lighting finesse (code).** Their scenes have soft volumetric light and halation; ours
   uses fog layers, bloom and corner bleeds. A cheap screen-space god-ray / halation pass
   could close part of it within budget on the full tier.

---
# Final polish round (2026-10-15)

## What changed
1. **Glitter grains.** `Pebbles` is now point-sprite glitter (`shaders/glitter.*`): power-law
   sizes (~80% tiny 1–2 px at 1×, ~17% small, ~3% medium, ~0.15% faceted "sparks"), mostly
   dim with a slow random twinkle (period 2–6 s), muted palette (~60% silver-lilac, 25%
   violet/pink, 10% teal, 5% gold), density falling off from the spine (reach capped
   inside the card ring). Full tier: bokeh by distance from the focus (the held card);
   lite: none. Atmosphere and trail grains share the soft point with a hot core. The
   instanced bead meshes and `glassChip.*` are gone. Sheet: `docs/screens/final-grains.jpg`.
2. **Spine silhouette.** A lilac rim light along the whole silhouette (wings included), wings
   shorter; no dark blades from any of 8 orbit angles: `docs/screens/spine-orbit.jpg`.
3. **Light.** `WorkHaze` (a fixed plane that read as a vertical band when the camera
   orbited) removed; a soft violet bleed off the upper-right corner drifting over ~8 s
   (`backdrop.frag` `uViolet`).
4. **Transitions.** The trail after the last card narrows and streams into System's centre
   and stays until the constellation fills the frame; System mounts its graph from
   toSystem 0.3. Depth: backdrop, word and bubbles come in earlier, the emerald grain wall
   sits just above the surface (the camera breaks through dust into the water); the data
   trail is brighter. The Core now descends into Contact from above (it used to rise
   through "LET'S TALK"). Strips at 0.25 s: `docs/screens/final-transitions.jpg`.
5. **Halation** (`post/HalationEffect.ts`, full tier only): a warm halo round highlights
   above threshold 1.1. God rays not added (optional).
6. **Card titles: General Sans Light** (Fontshare Free License, self-hosted
   `src/fonts/GeneralSans-Light.woff2`, not preloaded): clearly more editorial than
   Martian Mono 300 at 1× and Retina; Satoshi Light close but rounder.
   `docs/screens/title-type.jpg`.
7. **Performance fix found in the gate:** fast scrolling dipped to 15–20 fps (also on the
   previous commit). Cause: every pointer / wheel event raycast each card group,
   including its 14 000 dissolve-dust points, on the CPU. The dust is excluded from
   raycasting (`raycast={() => null}`). Work / System also unmount from view earlier.

## Quality gate
| | AMD (full) | HD 630 (lite) |
|---|---|---|
| Hero / statement / Work / System / Depth / Contact (after arriving) | 60.2 / 60.2 / 60.2 / 60.2 / 60.2 / 60.2 | 60.0 / 60.2 / 60.2 / 60.0 / 60.2 / 60.2 |
| Down the Work cards | 60.3 every card | 60.3 every card |
| Idle hero, 60 s (5 s windows) | 60.2 in all 12 | 55.0 first (tier switch), then 60.0–60.2 |
| Fast scroll, 2 full loops (1 s windows) | median 60, p10 58, min 19 (first second after load) | median 60, p10 58, min 16 (first second) |

- Lighthouse desktop: Performance 90–91 (three runs), Accessibility 100, Best Practices 100,
  SEO 100. Mobile: Performance 70 (TBT 1.3 s under 4× CPU throttle: the 3D start-up), FCP
  1.1 s, LCP 2.1 s, CLS 0; Accessibility / Best Practices / SEO 100.
- Reduced motion and the no-WebGL fallback checked. Phone number only on /impressum (build
  output, live pages, CV PDF). No console errors or warnings in the production runs.
- Final journey (desktop full, desktop lite, phone 390×844): `docs/screens/final-journey-4.jpg`.

## What still differs from the reference
1. Sculpted matter: their column / Lab are scanned assets; ours is procedural (needs a
   model in `public/models/spine-raw.glb`).
2. Card media: theirs are art-directed photo / video; ours are screenshots, a dashboard and
   abstract live scenes (needs better images or short clips per job).
3. Mobile load: Lighthouse mobile 70; the 3D start-up blocks ~1.3 s on a throttled CPU.
   Splitting more of the world's construction across idle callbacks would help (code).
4. Grain refraction: their grains bend what's behind them; ours are additive sprites (code,
   costly).
5. Volumetric light: their shafts and halation are richer; ours are fog layers, halation
   and corner bleeds (no god rays yet).

---
# Design round (2026-10-15) — "from rendered to art-directed"

## What changed
1. **A1 Spine: one sculpted organism** (`work/spineGeometry.ts`, `work/oilMaterial.ts`).
   The column is now one continuous surface: a tube whose cross-section is sculpted. Width
   swells and pinches (0.6–1.4×), two- and three-fold lobes twist slowly round it, ridged
   folds and broad noise carve it, it follows an S-curve, and it has rounded ends. Laplacian
   relax plus smooth normals mean no facets and no blades. Unlike the merged-sphere attempt,
   nothing intersects, so there are no seams and no hidden inner faces. Material: roughness
   0.2, clearcoat 1 (0.06), iridescence only at grazing angles, crevice glow, and glitter
   inside the material (two parallax layers). On phones it is narrower (0.5×) and stretched
   to run the whole card column. Sheet: `docs/screens/spine-sculpt.jpg` (concept, at_05,
   before, after, five orbit angles).
2. **A2 Atmosphere.** No starfield at Work: the atmosphere drops to 10% there. Backdrop fbm
   fog layers (4 octaves on full, 2 on lite, so lite gets fog too) and a backlight haze
   behind the column. Grains: 14 foam pockets (8 on the spine's surface, 6 at the cards'
   inner edges, never on a card face), each with its own muted hue, plus a sparse silver
   dust.
3. **A3 No hard-edged colour planes.** The lens shards (`LensShards`, `lensShard.frag`)
   are removed. 12 orbit angles checked: `docs/screens/work-12-angles.jpg`.
4. **A4 Cards** (`shaders/frost.frag`, `work/cardFace.ts`):
   - Family grade: saturation ×0.82, cool-violet shadow lift, highlights compressed below
     the spine's highlight.
   - A continuous bevel edge line (fwidth-based, lit from the top left, with a travelling
     glint) instead of dots.
   - The frost smear is capped and the per-channel copies are replaced by one fixed fringe,
     so there are no ghost doubles.
   - Titles: centred, fitted to the room (never clipped), on a feathered scrim whose
     strength is measured from the media's luminance in the title band (≥ 4.5:1).
   - Bliggit: wine/plum ground, phones on the right; the title band stays off the white
     screens.
   - Cards close to the lens fade.
   - Sheet: `docs/screens/card-family.jpg`.
5. **A5 3D words** (`sceneWord.frag`): a lit gradient, a chromatic fringe and a halo in the
   place's accent (violet at Work, blue at System, teal at Depth). They are never brighter
   than the cards.
6. **B1 Wireframe:** finer grain (hot-core sprite, size 0.008); 65% of the dust forms the
   phone wireframe.
7. **B2 Scramble** (`lib/scramble.ts`): 0.6s, left to right, look-alike glyphs, with every
   letter but the last two resolved by 60%. "LET'S TALK" no longer scrambles: it arrives
   with a 450ms slice glitch, then 0.2s every 8–12s.
8. **B3 Depth → Contact:** the ember trail now overlaps The Core's descent (until
   toContact 0.97), and The Core descends from above. The Core and the tagline no longer
   swing sideways on phones: their idle drift is translation only (`Drift rotate={false}`),
   because the rotation pivoted on the world origin, about 105 units away. Strip (0.25s,
   desktop full, desktop lite, phone): `docs/screens/final-transitions-2.jpg`. No empty
   frame on any of the three.
9. **C1 Phone Work:** one centred card at about 86% width, never clipped. The narrow spine
   runs behind the whole column, neighbours show as small hints, and the bottom 22% stays
   clear. Checked at 390×844, 375×667 and 430×932: `docs/screens/phone-work.jpg`.
10. **C2 Mobile start** (`SceneLoader.tsx`): see deviations.

## Deviations from the brief (please confirm)
- **Mobile start on first interaction, not at idle.** Starting the 3D at the first idle
  moment was measured and didn't help: GPU and shader start-up still blocked ~1.3s under
  the 4× CPU throttle (Lighthouse mobile ~70). On constrained devices (coarse pointer,
  width < 700, or ≤ 4 cores AND ≤ 4 GB memory) the static glass Core shows first, and the
  3D starts on the first touch, wheel, key or scroll. The static Core stays under the
  canvas until the canvas has faded in, so there is no empty frame. The memory condition
  was added because "≤ 4 cores" alone caught 4-core laptops and headless Chrome.
- **Grain split 90/10 instead of 65/35.** With 35% silver, the dust read as a starfield at
  Work, which the brief also rules out. 10% sparse silver matches "about 10% sparse dust".

## Quality gate (production build, Retina)
| | AMD (full) | HD 630 (lite) |
|---|---|---|
| Hero / statement / Work / System / Depth / Contact | 60.2 at every place | 60.2 at every place |
| Down the Work cards | 60.3 every card | 60.3 every card |
| Idle hero, 60s (5s windows) | 60.2 in all 12 | 54.4 first (tier switch), then 60.2 |
| Fast scroll, 2 loops (1s windows) | median 60, p10 55, min 13 (first second after load) | median 60, p10 56, min 14 (first second) |
| Phone 390×844, fast scroll (emulated on the AMD, not a real phone) | median 60, p10 57, min 14 (first second) | — |

The dip on first arriving at Work is gone; the only slow windows are in the first second
after load.

- **Lighthouse mobile:** 95 / 94 / 94 (TBT 170–180ms, LCP 2.5–2.6s, CLS 0).
- **Lighthouse desktop:** 92 / 91 / 93 (TBT 170–190ms, LCP 0.6s, CLS 0).
- Accessibility, Best Practices and SEO are 100 in every run.
- **Reduced motion:** clean (Work flight at 60.1 fps, no errors).
- **No-WebGL:** the static world renders, with no canvas and no errors.
- **Phone number:** only in /impressum's page and its server-only chunk. It is not in
  `.next/static`, and not on /, /cv, /datenschutz, /work/bliggit, /lab/work or the 404.
  The CV PDF text (extracted with PDFKit) contains no phone digits.
- No console errors or warnings in any production run.
- **Journey** (desktop full, desktop lite, phone 390×844): `docs/screens/final-journey-5.jpg`.
- **Work vs reference:** `docs/screens/work-vs-reference.jpg`.

## What still differs from the reference
1. **Spine richness.** Their column is a dense, glittering, iridescent scanned mass; ours is
   now smooth and seamless but reads as a plain violet trunk with a marbled film. Side by
   side (`work-vs-reference.jpg`), the previous crystal column was closer in sparkle.
   A sculpted model (`public/models/spine.glb`) or stronger in-material glitter and colour
   flecks would close this.
2. **Card media.** Theirs is art-directed photo and video; ours is screenshots, a dashboard
   and abstract live scenes.
3. **Grain refraction.** Their grains bend what's behind them; ours are additive sprites.
4. **Volumetric light.** Their shafts and halation are richer; ours are fog layers,
   halation and corner bleeds (no god rays).
5. **Phones start static.** The 3D begins on the first touch (see deviations). Until then
   the static Core is beautiful, but nothing moves.

---
# Final round (autonomous)

Branch `final-round` from tag `before-final` (6e1a45d). Nothing goes to `main`.

## Plan
**Measurement first (before any change).** Reference: `docs/reference/motion/Screen Recording
2026-10-12.mov` (3334×1708, 24 fps, 20.6 Mb/s). ffmpeg isn't installed, so a static build is
fetched into the session scratchpad (`ffmpeg-static`), not into the project.
- `scripts/extract-frames.mjs`: Work segment at 4 fps, centre-cropped to 16:10 and scaled to
  1440×900, then passed through the shared H.264 step → `docs/reference/work-frames/`.
- `scripts/record-work.mjs`: production build, desktop full tier, 1440×900, DPR 1, a fixed
  scripted wheel scroll through all six cards; frames at 4 fps plus each card's projected
  corners; the frames go through the same H.264 step → `docs/reference/work-frames-ours/`.
- `scripts/compare-frames.mjs`: 8% crop on every edge, cards masked (ours: projected corners;
  reference: detected bright frosted regions, checked by eye, hand masks if unreliable), then
  luminance / contrast / p5 / p95 / saturation / 12-bin hue / EMPTY AREA / SPARKLE →
  `docs/screens/metrics-work.md` (baseline, stage 1, stage 2, final).
- `scripts/sheet.mjs`: labelled image grids for every sheet.

**Stage 1 — spine** (`work/spineGeometry.ts`, `work/oilMaterial.ts`, `work/spine.worker.ts`,
`shaders/oil.glsl`, the spine block of `styles/scene.ts`; `work/WorkPlace.tsx` only for the
phone column's width). Restore all of them from b27333c with `git checkout b27333c -- …`
(Spine.tsx is identical in both commits), check build + types + Work in production, then:
(a) finer facets (denser tessellation and a facet-normal field in the shader), (b) silhouette
deformation of the restored mesh (0.7–1.3× width, slow twist, S-curve), blades shrunk into
lumps, (c) darker indigo body, sharp facet highlights, grazing iridescence, (d) column longer
than the frame / tips dissolving. Phones: column ~55–65% of the screen width.
Sheet `docs/screens/spine-final.jpg`. Fallback paths as in the brief.

**Stage 2 — air** (`work/Pebbles.tsx`, `shaders/glitter.*`, the Work haze in the backdrop
shader / `Backdrop.tsx`): 18–24 bigger foam pockets wrapping the column (some in front, some
behind, never on the focused card's face), a drifting violet-teal backlight haze behind the
column (cheaper on lite), 2–3 pockets on phones. Sheet `docs/screens/work-air.jpg`.

**Stage 3 — tune** spine material, pockets and haze only (max 3 passes) against the metrics;
the sheet decides.

**Gate:** FPS (both tiers), Lighthouse ×3 mobile/desktop, reduced motion, no-WebGL, phone
number only on /impressum, console clean, `final-journey-6.jpg`, `work-vs-reference-2.jpg`.

## LOCKED (unchanged this round)
Card system (family grade, bevel line, frost without ghosts, title scrim, General Sans Light
titles, Bliggit layout), phone Work card layout (one centred card, 86% width, bottom safe
area), phone start on first interaction (first swipe also scrolls), mobile/desktop
performance work, the tier system, hero, statement, tagline dust, wireframe, System, Depth,
Contact, scramble/glitch rules, transitions, UI, content, SEO, legal pages, CV. Phone number
only on /impressum.

## Decisions I made
- **Work segment = 26–51 s, not 44–60 s.** A 2 s contact sheet of 24–64 s shows Work begins
  at ~26 s (first card, "Frontier"), seg_44 matches 44–51 s (hover on one card), and from
  ~52 s a card is opened (no column, only the detail view). 26–51 s is the whole descent.
- **Reference crop.** The recording is 1.95:1; it is centre-cropped to 16:10 (the same
  vertical field as our 1440×900) before scaling, rather than squashed.
- **Shared compression.** Both sides' 4 fps frames go through one identical step (libx264,
  4 fps, ~0.8 Mb/s = the reference's bits per frame scaled to 1440×900), then are decoded
  again. Our frames are screenshots at the 4 fps instants (headless capture can't hold
  real-time video at 1440×900 with the GPU busy).
- **Reference card masks drawn by hand.** Automatic detection (bright, smooth regions) merged
  the column with the cards and missed the dark cards, so masks are hand-drawn quads, one
  keyframe per second, grown ~20px for the camera's drift (`work-masks-hand/quads.json`).
- **Baseline reading.** Against the reference, our Work was not *emptier* by the numbers but
  *flatter*: a lifted navy (p5 23 vs 11) that is never dark enough to count as empty, while
  the reference is near-black with dense coloured pockets. So "full" means contrast between
  dense pockets and black, not a lighter background. Stage 2 follows that.
- **SPARKLE vs "at least like b27333c".** b27333c's spine alone puts SPARKLE at 4.2× the
  reference (all on the column: glitter and glints; the reference's points sit mostly in the
  pockets around its column). Both acceptance lines can't hold. I kept the inner glitter
  (as asked) and made the facet glints softer, coloured sheen patches; SPARKLE ends Stage 1
  at 3.6×. It is left open rather than cut further, because the sheet looked worse with
  fewer glints.
- **Phones: Work stays drawn a little longer** (to toSystem 0.65 instead of 0.55): the
  longer column's dissolving foot is still leaving the frame there. Desktop unchanged.
- **Haze strength.** The first backlight washed the whole frame teal (the scene colours are
  linear, so 8% of teal in the base was a big lift). I kept the backlight subtle (a halo
  round the column) rather than "clearly visible", because the reference's darks are near
  black and every brighter version measured and looked further from at_05/at_06.
- **Gate fixes (after `final-stage-3`, both invisible):** the spine's material is now
  compiled asynchronously as soon as its mesh exists (it appears after the start-up warm-up,
  so its first frame at Work used to compile it synchronously: 49 fps on arrival); and the
  facet search on full looks at the 8 nearest cells instead of 27 (same irregular facets;
  the first card stops had dipped to ~55 at Retina).
- **Console warnings left alone.** Two warnings show in every production run, before and
  after this round: "THREE.Clock is deprecated" (raised inside React Three Fiber's own store,
  a library upgrade) and Chrome's "willReadFrequently" hint (the card faces' and tagline's 2D
  canvases, locked). Neither is from this round's changes; fixing them means touching locked
  code or upgrading a dependency, so they are listed instead.
- **"Lite" FPS.** The tier drops to lite only when the measured frame rate stays below 55.
  On the HD 630 at Retina it held 60, so those runs may have stayed on the full tier: the
  full look holds 60 on the integrated GPU too.

## Stage 1 — spine (tag `final-stage-1`)
**Path taken:** the main path (restore b27333c, then refine). No fallback was needed.

**Restored from b27333c** with `git checkout b27333c -- …`: `work/spineGeometry.ts`,
`work/oilMaterial.ts`, `work/spine.worker.ts`, `shaders/oil.glsl`, and the spine's `gloss`
(0.72) in `styles/scene.ts`. It built and ran against the newer code without conflicts
(cards, grains, phone layout and the mobile start were untouched and still work; 60 fps).
**Adapted afterwards:** the same four files, plus `work/Spine.tsx` (tessellation 0.1 / lite
0.2), `work/WorkPlace.tsx` (phone column size and position, phone hide point) and the spine
block of `styles/scene.ts` (`top` / `bottom`).

What changed on top of b27333c:
- **(a) Facets 2–3× smaller, no triangles.** Finer tessellation (0.13 → 0.10), and a facet
  field in the shader: the surface is split into small jittered cells (21 per unit, the
  nearest of 27 on full; one cube cell on lite), each tilted its own way. The mesh itself is
  now smooth shaded (and indexed: ~3× less memory), so no triangle edge shows at 1× or
  Retina; the facets are irregular polygons.
- **(b) Silhouette.** The whole carved mass is deformed: width 0.7–1.3× along the height,
  a slow twist and a gentle S-curve. Wings and drips are gone; one or two small rock lumps
  are fused to each vertebra instead.
- **(c) Gemstone value.** Deep indigo body (violet/blue × 0.12), carved hollows down to 18%
  (a `crevice` attribute from the carving depth), a thin cold rim only on the silhouette.
  Each facet has its own thin-film thickness, so it glints in its own hue (pink, violet,
  teal, green-gold) when it turns to the key direction; the film strengthens at grazing
  angles. The inner glitter is unchanged.
- **(d) No visible end.** The column now runs from y +10 to −12.2 (it used to end at −6.8,
  in view from the 4th card on, and was missing behind the last card). Both tips dissolve
  into glinting grains (the top over 4 units, the foot over 2.5), so the descent shows the
  column emerging from grains and the exit shows it breaking up before Work is hidden.
- **Phones:** the column behind the card is ~55–60% of the screen width (scale 0.5 → 0.85),
  unstretched, lifted so its foot dissolves behind the last card.

Sheet: `docs/screens/spine-final.jpg` (at_04–07; b27333c, 6e1a45d and new at 0°/120°/180°/
300° on desktop; the same on phones; Retina crops).

Self-review against at_05/at_06:
- Closer: dark gemstone body with multicoloured flecks and sharp glossy highlights on
  lobed forms, which is what their column reads as from a distance; no lilac clay, no
  blades, no end in any frame.
- Closer: the column reads as one carved mass that swells and pinches, not a pipe.
- Still different: their column is made of large, glossy, organic lobes with flowing
  iridescent bands; ours is a finer crust everywhere (less variety between smooth and
  crusty areas).
- Still different: their flecks are partly particles *around* the column (the pockets);
  ours are on the surface. Stage 2 adds the pockets.
- Metrics: luminance and p5 improved (darker body), SPARKLE rose (see decisions).

## Stage 2 — the air around the column (tag `final-stage-2`)
Files: `work/Pebbles.tsx`, `shaders/glitter.vert`, `shaders/glitter.frag`,
`shaders/backdrop.frag`, `canvas/Backdrop.tsx`, `work/WorkPlace.tsx` (phone pockets),
`lab/WorkLab.tsx` (passes the layout), `styles/scene.ts` (grain count 10k → 16k).
- **Foam pockets.** 20 on desktop (was 14): 16 wrap the column, one every ~0.9 units down,
  alternating sides and depths (1.25–1.85 from the axis, so the camera sees some in front of
  the column and some behind as it turns), and 4 hang between the camera and the column
  between the stops (out of focus on full). Spread 0.8–1.2 (2–3× the old 0.32–0.48). Any
  pocket that would sit between a card and the camera at the card's stop is moved round the
  column, so none covers a focused card. The 90/10 split stays (10% sparse silver dust).
- **The grains became beads.** Pocket grains are 3.2× the dust (3–8 px at 1×), drawn as
  soft filled discs with a faint rim (not hot points), kept at 80% saturation, each at 45%
  brightness with a gentler twinkle and no sparks (overlapping additive grains otherwise burnt
  the cores out). The body of a pocket is evenly dense, with 6% strays for the wispy edge.
  Hues: violet-pink, teal, a little green-gold. These are Pebbles-only uniforms
  (`uCloudScale`, `uSaturation`): the card-edge and Core clusters that share the shader keep
  their look.
- **Haze.** At Work the backdrop's base drops to a deep teal-charcoal below the world's
  charcoal (the reference's darks measure ~7,13,14; ours were ~33,39,58), darker towards
  the edges; the fog's lift is a quarter of what it was; the corner bleeds step back further.
  A tall violet → teal backlight follows the column on screen (projected each frame), broken
  up by the slow fog, so the dark column has a halo to stand against. Lite: the same with two
  fog octaves (as before) and half the grains (`setDrawRange`).
- **Phones:** three pockets round the column, between the cards; 25% of the grains.

Sheet: `docs/screens/work-air.jpg` (progress 2.00–3.00 in 0.10 steps between at_05 and at_06;
the integrated GPU and the phone at 0.25 steps).

Self-review against at_05/at_06:
- Closer: the space round the column is full of coloured bead clouds with clean dark between
  them, the way theirs is. No frame has a large flat area; foreground beads, the column with
  the cards, and the haze behind are three readable layers.
- Closer: the darks are now near-black teal-charcoal, not a lifted navy.
- Still different: their pockets are bigger and denser with more pink/magenta and green; ours
  lean violet and teal.
- Still different: their backlight / corner light is a little stronger (teal from the left in
  at_06). Ours is deliberately subtle after the first try washed the frame.
- Metrics: EMPTY 18% → 36% (reference 51%), SPARKLE 3.6× → 3.2×, hue distance 0.45 → 0.19.
- Note: a scripted jump in the first seconds after the phone's 3D starts can land back at the
  top (the phone `2.00` capture). Real swipes are unaffected; it is left alone (locked).

## Stage 3 — tuning with the numbers (tag `final-stage-3`)
Three passes, only spine material, pockets and haze (`work/oilMaterial.ts`,
`shaders/glitter.vert`, `canvas/Backdrop.tsx`, `shaders/backdrop.frag`). The sheet decided
each; numbers in `docs/screens/metrics-work.md`.
1. Darker Work base (bg × 0.4) and less fog lift (p5, EMPTY); pocket beads at 35% (p95,
   contrast); a more violet, less blue column body (hue). Sheet: the same look, a touch darker
   and more violet. Kept: luminance +26% → +20%, p5 +40% → +26%, p95 +33% → +24%.
2. A violet bleed low on the left (their at_06 has one) and a fainter upper-right bleed;
   column reflections 1.6 → 1.4. Hue distance got worse (0.19 → 0.22: on the dark teal base
   the violet lands in azure). The lower-left change was reverted.
3. Lower-left back to teal, keeping the fainter upper-right bleed and the lower reflections.
   Hue distance 0.17 (best), luminance +18%, contrast +20%, p95 +23%. Kept as final.

Still outside ±15% after three passes (listed as open points): luminance, contrast, p5,
p95, EMPTY AREA (−30%), SPARKLE (~3×) and the hue distance (0.17).


## Final gate (production build, Retina, `scripts/fps.mjs`)
| | Discrete GPU (full), DPR 2 | HD 630, DPR 2 | Phone 390×844, DPR 3 (emulated on the discrete GPU) |
|---|---|---|---|
| Hero / statement / Work / System / Depth / Contact | 60 / 60 / 59.9 / 60 / 60 / 60.2 | 60.2 / 59.7 / 60 / 60 / 60 / 60.2 | 60.2 / 60 / 60 / 60 / 60 / 60.2 |
| Down the Work cards (7 windows) | 59.9–60.3 | 59.9–60.3 | 59.9–60.3 |
| Idle hero, 60 s (5 s windows) | 60 in all 12 | 59.9–60.2 in all 12 | 60–60.2 in all 12 |
| Fast scroll, 2 loops (1 s windows) | median 59.9, p10 58.8, min 57.8 | median 59.8, p10 56.8, min 56.8 | median 59.9, p10 59.8, min 59.8 |

Every scene ≥ 55. Notes: one earlier full run had a single 1 s fast-scroll window at 46.9
(the others ≥ 55); a full run straight after an HD 630 run showed one 10.9 fps idle window
(the Mac switching GPUs; it did not repeat when run alone). One phone run lost its page
frame (a harness error); the rerun was clean.

- **Lighthouse** (3 runs): mobile 94 / 93 / 96 (TBT 207–223 ms, LCP 1.9–2.6 s, CLS 0);
  desktop 90 / 93 / 93 (TBT 170–203 ms, LCP 0.5–0.6 s, CLS 0). Accessibility, Best Practices
  and SEO 100 in every run.
- **Reduced motion:** Work renders (calm), no errors. **No-WebGL:** the static world, no
  canvas, no errors.
- **Phone number:** only in /impressum (its HTML/RSC and its server chunk); not in
  `.next/static`; not on /, /datenschutz, /cv, /work/bliggit or the 404; not in the CV PDF's
  text (PDFKit).
- **Console:** no errors. Two pre-existing warnings (see "Decisions I made").
- Sheets: `docs/screens/final-journey-6.jpg` (desktop full, HD 630, phone; progress 0–7 in
  0.5 steps; the phone's 0.50 tile shows the hero: the scripted-jump quirk noted in Stage 2)
  and `docs/screens/work-vs-reference-2.jpg` (8 matched frames).

## Final report
**1. Per stage**
- Stage 1, `final-stage-1`: spine restored from b27333c (main path, no fallback) and refined:
  facet field on a smooth-shaded mesh, 0.7–1.3× silhouette with twist and S-curve, lumps
  instead of blades, indigo gemstone body with per-facet coloured glints, tips dissolving
  into grains, a wider phone column. Files: `work/spineGeometry.ts`, `work/oilMaterial.ts`,
  `work/spine.worker.ts`, `shaders/oil.glsl`, `work/Spine.tsx`, `work/WorkPlace.tsx`,
  `styles/scene.ts`.
- Stage 2, `final-stage-2`: 20 big foam pockets of coloured beads, a dark teal-charcoal
  ground and a backlight behind the column. Files: `work/Pebbles.tsx`,
  `shaders/glitter.vert/.frag`, `shaders/backdrop.frag`, `canvas/Backdrop.tsx`,
  `work/WorkPlace.tsx`, `lab/WorkLab.tsx`, `styles/scene.ts`.
- Stage 3, `final-stage-3`: three tuning passes (pass 2 reverted). Files:
  `work/oilMaterial.ts`, `shaders/glitter.vert`, `canvas/Backdrop.tsx`,
  `shaders/backdrop.frag`.
- Gate: `work/Spine.tsx` (async compile), `shaders/oil.glsl` (8-cell facets).
- Tooling: `scripts/h264.mjs`, `extract-frames.mjs`, `hand-masks.mjs`, `record-work.mjs`,
  `compare-frames.mjs`, `metrics-report.mjs`, `capture-stops.mjs`, `capture-progress.mjs`,
  `sheet.mjs`, `fps.mjs`; a measurement-only corner export in `work/WorkCards.tsx` (active
  only when the recorder sets `window.__cardCorners`).

**2. Metrics** (full table and hue shares: `docs/screens/metrics-work.md`; "Final" is the
shipped code, re-recorded after the gate fixes)

| Metric | Reference | Baseline (6e1a45d) | Stage 1 | Stage 2 | Final |
|---|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 43.3 (+52% ✗) | 39.3 (+38% ✗) | 36.4 (+28% ✗) | 33.7 (+19% ✗) |
| Contrast (luma std dev) | 21.2 | 19.2 (-9% ✓) | 20.1 (-5% ✓) | 26.9 (+27% ✗) | 25.8 (+22% ✗) |
| 5th percentile | 10.8 | 23.3 (+116% ✗) | 17.5 (+62% ✗) | 15.1 (+40% ✗) | 13.4 (+24% ✗) |
| 95th percentile | 70.8 | 77.6 (+10% ✓) | 71.7 (+1% ✓) | 94.2 (+33% ✗) | 87.9 (+24% ✗) |
| Mean saturation | 0.427 | 0.435 (+2% ✓) | 0.405 (-5% ✓) | 0.424 (-1% ✓) | 0.442 (+4% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 18.0 (-65% ✗) | 18.5 (-64% ✗) | 35.8 (-30% ✗) | 36.4 (-29% ✗) |
| SPARKLE (points / MP) | 341 | 949 (+178% ✗) | 1242 (+264% ✗) | 1079 (+216% ✗) | 1072 (+214% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.38 ✗ | 0.45 ✗ | 0.19 ✗ | 0.18 ✗ |

**3. Decisions I made:** see "Decisions I made" above.

**4. Gate:** see "Final gate" above. All scenes ≥ 55 on both GPUs and the phone; Lighthouse
≥ 90 on both (3 runs); reduced motion, no-WebGL and the phone-number check pass; no console
errors, two pre-existing warnings.

**5. What still differs from the reference**
1. Their pockets are bigger, denser clusters with more pink/magenta and green, and real
   out-of-focus foreground clouds; ours are smaller and lean violet/teal. *Code can fix.*
2. Their column is large, smooth, organic glossy lobes with flowing iridescent bands; ours
   is a fine crystal crust everywhere (less contrast between smooth and crusty areas).
   *Needs art* (a sculpted model); code can only approximate it.
3. Card media: theirs are art-directed photo and video; ours are screenshots, a dashboard and
   abstract live scenes. *Needs art.*
4. Numbers still outside ±15%: brightness (+19–24%), EMPTY AREA (−29%), SPARKLE (~3×), hue
   distance (see table). Partly structural (their cards cover more of the frame, our column is
   always lit). *Code can fix* in part.
5. Their corner light and halation are richer (teal from the left in at_06); ours are kept
   subtle. *Code can fix.*

**6. Sheets made this round**
- `docs/screens/spine-final.jpg` (Stage 1)
- `docs/screens/work-air.jpg` (Stage 2)
- `docs/screens/final-journey-6.jpg` (gate)
- `docs/screens/work-vs-reference-2.jpg` (gate)
- `docs/screens/metrics/masks-reference.jpg`, `metrics/masks-ours-baseline.jpg` (the masks
  used by the metrics)

**7. Vercel preview:** every push to `final-round` builds a preview, but neither the GitHub
CLI nor a Vercel project link is available here, so I couldn't read its URL. It is on the
branch's latest commit in GitHub (deployment status) or in the Vercel dashboard.


---
# Detail 1 — cards
Branch `detail-cards`, started from `final-round` (not `main`, which doesn't include the final
round yet; confirmed with you before starting): the card frost doesn't depend on the scene,
but the card-tone check, the measurement tools and the corner export only exist there.
Merge `final-round` first, then this.

## What changed (card shading only)
- **Smoked glass** (`shaders/frost.frag`, `uSmoke` 0.42 in `work/WorkCards.tsx`): while
  frosted, the media sits at 42% inside the glass. Where the glass clears (the hover spot,
  the opened card) the image comes back at full brightness and sharp, so closed vs open is
  now a strong contrast.
- **Dark smoke instead of milk** (`uHaze` in `work/WorkCards.tsx`): the veil was a light grey-green
  (~sRGB 80+, the pastel/milky look); it is now a dark slate-teal smoke (~sRGB 30). Same
  frost structure and amount; only its colour.
- **Family palette** (`shaders/frost.frag`): behind the frost, lavender desaturates towards
  dusty violet and pink shifts towards deep wine; teal is untouched.
- **Live scenes** (`work/cardScenes/CardScene.ts`, `shaders/cardScenes/sky.frag`): the
  backdrop is near-black with only a faint bleed of the subject's colours (the corners were
  at 55% / 40% of the full accent, the pastel pink and lavender fills).
- **Titles** (`work/cardFace.ts`, `shaders/frost.frag`): the glow behind the letters is about
  half (shadow 0.55 / 24px → 0.3 / 13px), and the title is no longer lifted past white by
  the card's focus brightness (that pushed it into the bloom). Still white; the scrim is
  unchanged.
- Unchanged: layout, sizes, poses, bevel line and its glint, frost structure, fonts and
  text, the Bliggit layout.
- Tooling: `compare-frames.mjs --inside` and `metrics-report.mjs --cards`.

## Cards metrics (inside the cards; full table in `docs/screens/metrics-work.md`)
| Metric | Reference | Baseline | Pass 1 | Pass 2 | Final (pass 3) |
|---|---|---|---|---|---|
| Mean luminance (0–255) | 47.5 | 94.1 (+98% ✗) | 66.7 (+41% ✗) | 61.0 (+28% ✗) | 56.6 (+19% ✗) |
| Contrast (luma std dev) | 27.7 | 34.5 (+24% ✗) | 33.5 (+21% ✗) | 35.0 (+26% ✗) | 34.9 (+26% ✗) |
| 5th percentile | 15.8 | 56.7 (+258% ✗) | 42.1 (+166% ✗) | 34.8 (+120% ✗) | 31.4 (+98% ✗) |
| 95th percentile | 93.7 | 159.8 (+71% ✗) | 133.7 (+43% ✗) | 132.1 (+41% ✗) | 127.5 (+36% ✗) |
| Mean saturation | 0.357 | 0.296 (-17% ✗) | 0.268 (-25% ✗) | 0.310 (-13% ✓) | 0.293 (-18% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.42 ✗ | 0.52 ✗ | 0.53 ✗ | 0.53 ✗ |

Three passes. Pass 1 (smoke 0.55, darker live backdrops, title glow) and pass 2 (the veil
made genuinely dark: linear colour, so the "darker" milk had still been ~sRGB 80) were kept;
pass 3 (smoke 0.42, dusty-violet / wine grade) was kept because the sheet was closest to the
reference, although saturation fell back from −13% to −18%.

Still outside ±15% after the three passes:
- **Luminance +19%** (target ±15%); p5 +98%: the darkest card pixels are still the smoke
  veil (~sRGB 30) where theirs go to ~16. One more step on the veil (about a third darker)
  would likely close both. Open.
- **Saturation −18%** (pass 2 was in range at −13%): the dusty-violet grade takes colour out.
- **Hue distance 0.53** (was 0.42): theirs is mostly cyan with some wine; ours leans azure and
  blue-violet because the live scenes' subjects are violet and blue. The darker cards read
  closer on the sheet, but by hue they moved away. Changing the subjects' colours would be
  outside this round (card shading only).
- **Bliggit at rest:** darker, but the red still reads fairly vivid rather than deep wine
  (it is a photo cover, not a live scene). Hover still defrosts it, as intended. Open.

## Sheet
`docs/screens/cards-tone.jpg`: the 8 matched pairs from `work-vs-reference-2.jpg`, reference
| before | after. After is closer in every pair: dark smoky slate, dusty violet and wine panes
sitting inside the darkness, recognisable media (globe, shield, device grid, bars, Core),
crisp titles.

## Checks
- Title contrast (white strokes vs the brightest 10% of the media round them): 4.7–7.5 on
  the 8 desktop frames (4.7 = Bliggit), 6.2–8.7 on the phone frames. All ≥ 4.5:1.
- Phone 390×844: titles readable on every card.
- FPS (Retina): full tier, Work cards 59.9–60.3, every place 60, fast scroll p10 57.9 /
  min 56.9. HD 630: Work cards 59.9–60.3, every place 60, fast scroll p10 56.9 / min 56.3
  (one idle window at 16.3 right after the GPU switch, as in the final round).
- Lighthouse (3 runs): desktop 90 / 90 / 91, mobile 95 / 93 / 92; Accessibility, Best
  Practices, SEO 100; no console errors.
- One full-tier FPS run aborted with a "detached frame" (headless harness). Four repeated
  place tours with navigation logging showed no reload, crash or error; the rerun was clean.


---
# Detail 1b — cards
Branch `detail-cards-2` from `main` (after merging `final-round` and `detail-cards`, tagged
`v1-cards`).

## What changed (card shading + the live scenes' colours)
- **Darker veil** (`uHaze` in `work/WorkCards.tsx`): one third darker (0.07 → 0.045), then a
  last step in pass 3 (0.035); it also leans more teal (teal 0.2 → 0.45), so the dark card
  face reads teal-slate, not blue.
- **Titles under the bloom** (`shaders/frost.frag`): the darkest card pixels were not the veil
  but the post bloom/halation spreading from the bright white title. The title is now drawn
  at 70% (a light grey-white, like the reference's "FRONTIER WITHIN"), just under the bloom
  threshold: still crisp, far above 4.5:1, and the card round it stays dark.
- **Shadow lift** (`shaders/frost.frag`): the grade's violet-blue lift in the darks now uses
  the veil's own teal-slate colour (it was the main source of the azure cast).
- **Live scenes recoloured** (`work/cardScenes/*`, tones derived once in `CardScene.ts`:
  `CARD_TONES.wine` = ember → violet, darkened; `slate`; `silver`), each keeping its identity:
  - Kühne+Nagel globe: unchanged (teal).
  - Adesso shield: deep teal-slate glass with a wine rim light; teal lattice; the ember/gold
    flaws stay.
  - E.ON device grid: cyan-teal tiles and links on near-black (pulses still aqua).
  - Licht & Schatten bars: deep wine glass with a warm gold light on the bar tops
    (`glassRim.frag` got a `uTop` colour, white by default); the flow is wine/gold/aqua.
  - Freelance Core: cool silver-teal glass, teal/silver/gold dust.
  - Bliggit: unchanged (real screenshots).
- **Texture** (`shaders/frost.frag`): a static film grain in the media under the frost, two
  scales (clumps of a few pixels), about ±4% of the display range, applied in gamma space
  so it shows in the darks. It is tied to the frost: hover and the opened card are clean.

## Cards metrics (inside the cards)
| Metric | Reference | Before detail 1 | Detail 1 | 1b pass 1 | 1b pass 2 | 1b final (pass 3) |
|---|---|---|---|---|---|---|
| Mean luminance (0–255) | 47.5 | 94.1 (+98% ✗) | 56.6 (+19% ✗) | 55.8 (+18% ✗) | 47.2 (-1% ✓) | 45.8 (-3% ✓) |
| Contrast (luma std dev) | 27.7 | 34.5 (+24% ✗) | 34.9 (+26% ✗) | 35.4 (+27% ✗) | 32.4 (+17% ✗) | 32.8 (+18% ✗) |
| 5th percentile | 15.8 | 56.7 (+258% ✗) | 31.4 (+98% ✗) | 30.6 (+93% ✗) | 22.5 (+42% ✗) | 20.2 (+27% ✗) |
| 95th percentile | 93.7 | 159.8 (+71% ✗) | 127.5 (+36% ✗) | 127.6 (+36% ✗) | 116.1 (+24% ✗) | 115.6 (+23% ✗) |
| Mean saturation | 0.357 | 0.296 (-17% ✗) | 0.293 (-18% ✗) | 0.275 (-23% ✗) | 0.319 (-11% ✓) | 0.329 (-8% ✓) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.42 ✗ | 0.53 ✗ | 0.38 ✗ | 0.19 ✗ | 0.18 ✗ |

Three passes: pass 1 (veil, recolour, grain) moved the hue (0.53 → 0.38) but not the floor;
pass 2 (title under the bloom, teal veil and shadow lift) brought luminance, saturation and
hue into range; pass 3 (visible grain, one more veil step) kept them there and lowered the
floor. Every pass was closer on the sheet; none was reverted.

Targets: luminance −3% ✓, saturation −8% ✓, hue distance 0.18 ✓ (≤ 0.25). Still outside:
p5 20 vs 15.8 (+27%; asked for 16–18), contrast +18%, p95 +23% (the bevel line and the
titles, both kept).

## Sheets
- `docs/screens/cards-tone-2.jpg`: the 8 matched pairs, reference | detail 1 | now.
- `docs/screens/title-font-compare.jpg`: Kühne+Nagel, Adesso and Freelance at their stops,
  (a) General Sans Light vs (b) Departure Mono (the site's existing `?type=pixel` title
  style), same size and position, next to the reference's "FRONTIER WITHIN". The font is
  not changed; your call.

## Gate
- FPS (Retina): full tier, Work cards 60.0–60.3, every place ≥ 59.9, fast scroll p10 56.8 /
  min 55.8; HD 630, Work cards 59.9–60.4, every place ≥ 60, fast scroll p10 57.9 / min 56.9.
- Lighthouse (3 runs): desktop 91 / 91 / 93, mobile 94 / 95 / 94; Accessibility, Best
  Practices, SEO 100; no console errors.
- Title contrast: 4.6–6.8 on the 8 desktop frames, 4.7–6.5 on phone (worst case: the
  brightest 10% of the media round the letters). Bliggit measured on its title band: 5.9
  (the frame-wide check also picked up the white phone screenshots).
- Phone 390×844: titles readable on every card.


---
# Detail 2 — titles + column
Branch `detail-column` from `main` (after merging `detail-cards-2`, tagged `v1-cards-2`).

## Part A — card titles in Departure Mono (`detail 2a`)
- Card titles are set in Departure Mono, uppercase, on two centred lines like the
  reference's "FRONTIER WITHIN": split at the word break that balances the two lines'
  widths (`splitTitle` in `work/cardFace.ts`). The widest line fills ~52% of the card (never
  past the nearer edge), letter-spacing 3px (at the 1024px face), line height 1.08. The 70%
  light grey-white, the faint glow and the measured scrim are kept; the scrim now covers both
  lines. The scramble runs per line.
- Breaks: >99% / CRASH-FREE, CYPRESS / GUIDELINES, −40% / COUPLING, >80% TEST / COVERAGE,
  MERN / END TO END, THIS / SITE. "MERN end to end" has non-breaking spaces in its metric
  (`content/site.ts`) so the balanced split keeps "END TO END" together; the HTML text reads
  the same.
- The company line and the index/years are unchanged in size and place; the company line is
  now in Departure Mono too (it used General Sans).
- General Sans removed: `src/fonts/GeneralSans-Light.woff2`, its `localFont` in
  `styles/fonts.ts` and its variable in `app/layout.tsx` (nothing else used it).
- Contrast (title strokes vs the brightest 10% of the media round them): 4.6–6.1 on desktop,
  4.6–5.6 on phone; Bliggit 6.1 and THIS SITE 4.9 measured on their title bands (the frame-wide
  check had picked up the phone screenshots and a spine highlight). Phone 390×844: readable on
  every card at ~50% width (the 75% allowance wasn't needed).
- Sheet: `docs/screens/title-font-final.jpg` (the reference, all six cards on desktop, all six
  on the phone).

## Part B — the column: glossy vertebrae (`detail 2b`)
Files: `work/spineGeometry.ts`, `work/oilMaterial.ts`, `shaders/oil.glsl` (the worker is
unchanged: it builds whatever `createSpineGeometry` returns).

- **Segment rhythm** (`createSegments`, `segmentAt`, `vertebrae()`): the carved mass is cut
  into vertebrae 1.2–1.8 long (0.8–1.2 card heights), each a slightly asymmetric rounded lobe
  (its widest point 38–62% down it) of its own size (0.9–1.15×), joined by necks at 62–68% of
  the lobe; each vertebra turns (±0.45 rad) and leans (±0.11) about its own centre, so
  neighbours never repeat. The necks count as crevices, so they fall to near-black. The
  silhouette deformation, S-curve, twist, dissolving tips and phone width are unchanged.
- **Processes:** a flattened sideways lump on ~60% of the bodies (no blades).
- **Big smooth surfaces:** the fine chip crust is gone from the carving (only broad swells
  and a medium ridge remain). The facet field is 4× larger (cells at 5 per unit instead of
  21), its tilt halved, and softened: the two nearest cells blend over a wide edge. Each
  lobe holds 1–3 broad highlights.
- **Highlights:** near-mirror clear coat (roughness 0.1, clear coat 1 at 0.03) and a key
  highlight that is crisp in its centre and ringed by a thin film running teal → pink →
  gold towards its edge. The per-facet thin-film colours (the confetti) are gone; the
  physical film only shows at true grazing angles. The silhouette rim is a third of what it was.
- **Inner glitter** cut to 20% (threshold 0.992 → 0.9984), dimmer, deeper.
- **Value:** necks and hollows down to 10% (were 18%); the lobes keep the deep indigo.
- **Lite:** the same segments and highlights; no facet field at all (smooth lobes). The
  cube-cell variant showed blocky.

Passes: (1) segments + broad facets + new highlights: the vertebrae read immediately, but
the highlights and large areas went copper-brown; (2) film only at grazing, weaker rim, more
carved detail and processes: closer, kept; (3) darker body (environment 1.4 → 1.0), stronger
film ring, film range 300–600 nm: barely different on the sheet, copper back in places, and
luminance worse than before the round, so it was reverted to pass 2.

### Column metrics (column + air)
| Metric | Reference | Before (detail 1b) | Pass 1 | Pass 2 | Pass 3 (reverted) | Final |
|---|---|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 33.1 (+17% ✗) | 32.6 (+15% ✓) | 32.9 (+16% ✗) | 33.7 (+19% ✗) | 33.2 (+17% ✗) |
| Contrast (luma std dev) | 21.2 | 25.8 (+22% ✗) | 27.1 (+28% ✗) | 28.1 (+33% ✗) | 28.9 (+37% ✗) | 28.2 (+33% ✗) |
| 5th percentile | 10.8 | 13.1 (+22% ✗) | 12.3 (+14% ✓) | 12.6 (+17% ✗) | 12.9 (+19% ✗) | 12.6 (+17% ✗) |
| 95th percentile | 70.8 | 87.3 (+23% ✗) | 87.0 (+23% ✗) | 88.6 (+25% ✗) | 91.2 (+29% ✗) | 88.8 (+25% ✗) |
| Mean saturation | 0.427 | 0.452 (+6% ✓) | 0.455 (+7% ✓) | 0.450 (+5% ✓) | 0.448 (+5% ✓) | 0.448 (+5% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 36.2 (-29% ✗) | 39.9 (-22% ✗) | 39.7 (-22% ✗) | 38.8 (-24% ✗) | 38.9 (-24% ✗) |
| SPARKLE (points / MP) | 341 | 1103 (+223% ✗) | 818 (+140% ✗) | 772 (+127% ✗) | 709 (+108% ✗) | 748 (+119% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.17 ✗ | 0.18 ✗ | 0.17 ✗ | 0.16 ✗ | 0.17 ✗ |

- SPARKLE: 1103 → 748 /MP (+223% → +119%), not within ±25%. What remains sits mostly along
  the column's silhouette and in the dust (sparkle map), not in the column's interior; the
  reference measures low there because its cards cover most of the frame.
- EMPTY AREA improved (36.2 → 38.9%) and luminance held (+17% → +17%), as required. Contrast
  rose (+22% → +33%): the big highlights against the darker necks.

Sheet: `docs/screens/column-vertebrae.jpg`: reference column crops (28, 31, 41, 48.5 s) | now
| new | new on the HD 630, at 0°/120°/180°/300°, and the phone (now | new). At 180° and 300°
the centre crop is mostly cards; 0° and 120° show the column.

Self-review against at_04–at_07:
- Closer: the column now reads as a chain of glossy vertebrae with dark gaps and a few big
  bright highlights, not a confetti crust.
- Still different: their vertebrae are more intricate (thin wing-like processes, holes,
  layered plates) and their edges are strongly iridescent teal/pink; ours are rounder lobes
  whose highlights lean white with copper patches from the environment's warm moments.
- Still different: their body is near-black chrome; ours keeps a lilac-indigo sheen.

## Gate (after both parts, production, Retina)
| | Discrete GPU (full) | HD 630 |
|---|---|---|
| Every place | 59.9–60 | 59.9–60 |
| Down the Work cards | 58.7–60.4 | 59.9–60.3 |
| Idle hero 60 s (5 s windows) | 60 in all 12 | 60–60.2 in all 12 |
| Fast scroll, 2 loops (1 s windows) | median 59.9, p10 55.9, min 54.9 (3 runs: min 40.9 / 54.9 / 54.9) | median 59.8, p10 57.8, min 57.8 |

- Full tier fast scroll: the slowest 1 s window is 54.9, 0.1 under the 55 line, in two of
  three runs (one run had a single 40.9 window). The new column costs a little more on full
  (the first two card stops 58.7 vs 60 before). Borderline; left as is, not hidden.
- Lighthouse (3 runs): desktop 93 / 92 / 93, mobile 94 / 94 / 95; Accessibility, Best
  Practices, SEO 100; no console errors.
- Reduced motion and no-WebGL: clean, no errors. Phone number: only on /impressum (not in
  `.next/static`, not on /, /datenschutz, /cv, /work/bliggit or the 404).


---
# Detail 2c — vertebrae
Branch `detail-column-2` from `main` (tags: `before-vertebrae` on the old main, `v1-vertebrae`
after merging `detail-column`).

## What changed
Files: `work/spineGeometry.ts`, `work/oilMaterial.ts`, `shaders/oil.glsl`, `work/Spine.tsx`;
for the frame-rate fix `post/Effects.tsx`, `SceneCanvas.tsx`, `work/WorkCards.tsx`.

1. **Body: near-black chrome.** Metalness 1 on a neutral base with a trace of indigo (no
   lilac diffuse); its colour comes only from what it reflects. Necks and hollows at 8%.
   Finding: with the scene's shared environment, three replaces a material's
   `envMapIntensity` by `scene.environmentIntensity`, so the spine's 1.4 (v1) and my 0.55 /
   0.32 / 0.18 never applied. For a metal the base colour is the reflection strength, so the
   darkening is done there (0.62 → 0.3).
2. **Highlights: iridescent, not white/copper.** three's physical iridescence is off; the
   spine has its own thin film (`oilFilm`): every reflection takes a teal → pink → teal colour
   by angle with a rare gold band, strongest at grazing angles; only a highlight's hottest
   centre stays white. The warm light: checked; the hero's warm pulse is already zero at Work
   (`calm` = toWork × 3) and Contact's warmth starts after Work is hidden, so it never reached
   the spine. The copper came from the old film range (380–820 nm), which is gone; the film now
   re-colours every reflection, so a warm cast can't come back either.
3. **No more balloons.**
   - Plates: each vertebra is now 2–3 overlapping thin plates (0.5 apart, sharper bevels,
     turned more against each other) instead of one fused block per 0.93.
   - Variation: segment size 0.6–1.4× (was 0.9–1.15), tilt ±0.2 (was ±0.11), and ~35% of the
     lobes cut in flat on one side.
   - Spurs: on about half of the vertebrae, 1–2 thin curved tapering spurs (0.3–0.55 long)
     from the lobe's belly, built after the carving and passed through the same vertebra and
     column deformation, unlit hollows excluded (they carry the film rim; none reads as a
     black blade).
   - Grooves: a normal field of fine wandering ridges and grooves (`oilGrooves`) on every
     plate, so the highlights break up along the forms.
4. **Highlights smaller and sharper:** key core pow 420 (was 140), film ring pow 140 (was 36),
   facet tilt 0.14.
5. **Outline:** the roughness rises towards the silhouette (to 0.4 at grazing), so the mirror
   doesn't alias into single bright pixels there; the silhouette rim term stays at 0.08.
6. **Lite:** same plates, spurs, grooves, film and highlights; no facet field, no clear coat
   (smooth, not blocky).
7. **Frame rate, the cause and the fix** (long-frame probe with WebGL call tracing):
   - The 67 ms hitch leaving Work (and one entering): `Scene` passes `antialias={!atWork}`
     to `Effects`; every Work enter/exit re-rendered the EffectComposer with new children,
     which rebuilt all its passes and the bloom's 8-level blur targets (18 new framebuffers
     each time), even on Retina where multisampling stays 0. Fix: the composer subtree is
     memoised on what changes the pipeline (multisampling, tier).
   - The dropped frames entering / leaving Work: the per-place DPR cap (statement 1.25, Work
     1.4, System 2) resized the canvas, reallocating every render target, mid-scroll. Fix:
     a new cap applies once the scroll has paused for 300 ms (`useSettled`): no resolution is
     lowered anywhere, the canvas just sharpens when you stop.
   - Each live card scene now renders once at start (one per frame), so its render target
     and pipeline aren't created mid-scroll.
   - The new column is heavier on the integrated GPU; two invisible cuts bring it back to
     v1's level there: the film's variation is a cheap sine pattern instead of a noise, the
     patchy roughness comes from the facet hash already computed, and the tessellation is 0.12
     (smooth shading hides it).

Passes: (1) chrome + plates + spurs + grooves + film: the right character at once, but bright
silver-grey and a weak film; (2) stronger film, shorter spurs: closer in colour, body still
bright; (3) darker body: its first version (envMapIntensity) had no effect, found and applied
through the base colour. Each was closer on the sheet; none reverted.

## Metrics (column + air)
| Metric | Reference | v1-vertebrae | Pass 1 | Pass 2 | Pass 3 | Final |
|---|---|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 33.2 (+17% ✗) | 38.4 (+35% ✗) | 38.4 (+35% ✗) | 34.2 (+21% ✗) | 34.2 (+21% ✗) |
| Contrast (luma std dev) | 21.2 | 28.2 (+33% ✗) | 33.1 (+56% ✗) | 33.3 (+57% ✗) | 28.1 (+33% ✗) | 28.2 (+33% ✗) |
| 5th percentile | 10.8 | 12.6 (+17% ✗) | 14.7 (+36% ✗) | 14.8 (+37% ✗) | 13.3 (+23% ✗) | 13.1 (+21% ✗) |
| 95th percentile | 70.8 | 88.8 (+25% ✗) | 109.7 (+55% ✗) | 110.3 (+56% ✗) | 94.0 (+33% ✗) | 94.3 (+33% ✗) |
| Mean saturation | 0.427 | 0.448 (+5% ✓) | 0.412 (-4% ✓) | 0.418 (-2% ✓) | 0.428 (+0% ✓) | 0.431 (+1% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 38.9 (-24% ✗) | 37.0 (-28% ✗) | 37.3 (-27% ✗) | 38.2 (-25% ✗) | 37.6 (-26% ✗) |
| SPARKLE (points / MP) | 341 | 748 (+119% ✗) | 559 (+64% ✗) | 548 (+61% ✗) | 830 (+144% ✗) | 793 (+133% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.17 ✗ | 0.25 ✗ | 0.24 ✗ | 0.23 ✗ | 0.23 ✗ |

- SPARKLE: +119% → +133%. It fell to +61% in pass 2, then rose again with the darker body
  (the same highlights stand out as more local maxima against near-black). Not within ±25%.
- Luminance +17% → +21% and EMPTY AREA 38.9% → 37.6%: both slightly worse than v1-vertebrae,
  against the brief's "must not get worse". The chrome plates reflect more of the studio than
  v1's indigo lobes; one more darkening step would likely fix both, but the three passes were
  used. Open.
- Contrast held (+33%), saturation +1%.

## Sheet
`docs/screens/column-vertebrae-2.jpg`: reference column crops (28, 31, 41, 48.5 s) |
v1-vertebrae | new, at 75°, 105°, 195° and 225° (between the card stops, the camera framed on
the column), desktop full, the HD 630, and the phone (v1 | new).

Self-review against at_04–at_07:
- Closer: dark chrome made of layered irregular plates with spurs and grooves, teal and pink
  iridescent reflections, small sharp highlights; no balloons, no copper, no lilac.
- Still different: their body is darker still (near-black between reflections); ours shows
  more mid-grey chrome. Their spurs and wings are longer and more numerous.
- Still different: their iridescence is more saturated at the edges.

## Gate (production, Retina)
| | Discrete GPU (full) | HD 630 |
|---|---|---|
| Down the Work cards | 59.9–60.4 | 59.9–60.4 |
| Every place | 60 | 59.9 |
| Idle hero 60 s | 60 in all 12 windows | 59.9–60 |
| Fast scroll, 2 loops: slowest 1 s window | 59.8 in 4 of 5 runs; 45.9 once | 56.9, 56.8 |

- Full tier: the one slow window appears only in the first full run right after an HD 630 run
  or a recording (the Mac switching GPUs; the long-frame probe shows no hitch at Work on the
  full tier any more). Three back-to-back runs: 59.8 each. Before this round: 54.9 / 40.9.
- Lighthouse (3 runs): desktop 93 / 92 / 93, mobile 94 / 98 / 95; Accessibility, Best
  Practices, SEO 100; no console errors.
- Reduced motion and no-WebGL: clean. Phone number only on /impressum (not in `.next/static`,
  not on /, /datenschutz, /cv, /work/bliggit or the 404).


---
# Polish loop 1 (2026-10-16)
Branch `polish-loop1` from `main` after merging `detail-column-2` (fast-forward, tagged
`v1-chrome`; the same commit is tagged `before-loop1`, 9d1c28e). Nothing goes to `main`.
Every stage ends with a commit, a tag `loop1-stage-N` and a push of the branch.

## Plan
Tools: the existing `scripts/` (capture-progress, capture-stops, record-work,
compare-frames, metrics-report, sheet, fps), plus `scripts/capture-moments.mjs` (timed frames at
one place: the hero's idle turn, a cursor swipe, transitions in time). Production build on
port 3100, Retina where frame rates are measured; ffmpeg from the session scratchpad for the
shared H.264 step of the metrics.

**Stage 1 — the hero.** `hero/HeroLighting.tsx`, `hero/glassMaterial.ts`,
`hero/glassTextures.ts`, `hero/bandGeometry.ts`, `hero/Emblem.tsx`, `hero/HeroAura.tsx`,
`hero/motion.ts`, `styles/scene.ts` (+ shaders only where these need one).
1. Thin film on the bevels and edges, its thickness running along the outline, so a rainbow
   highlight slides round the rim as The Core turns; teal, violet and amber light-formers in
   the hero environment, so the refraction carries colour.
2. Detail: a crisp inner chamfer step and a second thin inner edge in the band profile; fine
   engraved micro-lines on the faces (normal detail).
3. Light drift on full: cool → warm copper → cool every ~9 s, done in the glass material
   (tint uniforms per frame) on an environment baked once: no per-frame cube-map re-render.
   Lite: the static cool environment and a gentle warm rim tint.
4. Living space: sparse dust round and behind The Core (never in front of its centre), a few
   gold/pink sparks rising slowly, 2–3 faint out-of-focus glass shards / arcs far behind,
   catching the rim light now and then. The grains take Stage 3's glass look when it lands.
5. Kept: the intro burst, the 1.5× scale, the teal bleed bottom-left.
Sheet `docs/screens/loop1-hero.jpg` (at_01 + seg_00 tiles | now | new; 4 moments of the
idle turn; desktop + phone).

**Stage 2 — the column.** `work/spineGeometry.ts`, `work/oilMaterial.ts`,
`work/spine.worker.ts`, `shaders/oil.glsl` only.
1. Core body ~32% slimmer, chunky only at each vertebra's centre.
2. 2–4 processes on most segments: curved, tapering, layered, reaching out and slightly
   down, 0.6–1.2× the core width; every one with an iridescent rim.
3. Thin parts (processes, plate edges) read translucent: a thinness attribute drives fresnel
   transparency / film glow on full; lite: the fresnel rim tint only. The core stays dark chrome.
4. Highlights travel with the orbit; one soft specular band sweeps down the column every ~7 s.
5. Fewer single-pixel glints along the outline.
Metrics (column + air) vs the reference and v1-chrome; sheet `docs/screens/loop1-column.jpg`.

**Stage 3 — one glass-particle system.** A shared bead shading (`shaders/glassGrain.glsl`) and
a shared cursor field (`canvas/particles/CursorField.ts` + `shaders/cursorField.glsl`: a
decaying ping-pong texture on full, stateless position/velocity uniforms on lite), used by
the existing grain shaders (`glitter.*`, `atmosphere.*`, `grain.frag`, `motes.vert`,
`ember.frag`) and their components (`work/Pebbles.tsx`, `journey/Atmosphere.tsx`,
`hero/HeroAura.tsx`, the System / Depth / Contact particle components) for per-place density.
A) sizes ~75% tiny / ~20% small / ~5% medium-large, per-grain brightness; pockets with denser
cores and wispy edges; bokeh away from the focus on full. B) bead shading: dark body, fresnel
rim, one glint up-left, thin-film rim tint, a ~0.5–1 px fringe; refraction on full for the
medium/large beads; glints flicker on their own phase. C) glints brighten through each place's
light direction and pick up nearby highlight colour. D) cursor (touch-drag on phones): push +
swirl with falloff, scaled by speed, spring return in 1–1.5 s, depth parallax; never over the
focused card or text; off with reduced motion. E) density per place, falling off round text
and subjects. Sheets `loop1-particles.jpg`, `loop1-pockets.jpg`, `loop1-cursor.jpg`.

**Stage 4 — gallery composition (desktop).** `work/layout.ts`, `journey/path.ts`,
`work/WorkCards.tsx` (neighbour DoF / dimming only). A tighter spiral (smaller angle and
vertical step between cards, same total Work scroll), the focused card ~50–55% of the frame and
never overlapped, neighbours at clearly different depths and cut by the frame edges, the list
zone clear. Target: 3–4 cards in ≥ 80% of Work frames. Sheet `loop1-composition.jpg`.

**Stage 5 — the opened card.** `work/WorkCards.tsx` (open transform, open/close timing),
`shaders/frost.frag` (open grade), `shaders/cardDust.*` (dissolve grains as Stage 3's beads).
Centred right of the details, facing the camera (≤ 3–4°), ~70–75% of the frame height, never
cut on desktop; media ≤ 1.4× the closed brightness at the closed saturation; all six checked;
phone fits the width. Sheet `loop1-open-card.jpg`.

**Stage 6 — the capstone opens.** `depth/CapstonePanel.tsx`, `depth/DepthPlace.tsx`,
`components/depth/DepthPanel.tsx`, `components/work/WorkDetail.tsx` / `JobDetail.tsx` (the
shared detail column), `stores/work.ts`, `components/work/useWorkUrl.ts`,
`app/(site)/work/[slug]/page.tsx`, `proxy.ts`, `app/sitemap.ts`, `app/assets.json/route.ts`
(the gallery list). Hover tilt + "OPEN" cursor + light defrost; click / Enter opens it like a
job card in the Depth palette; detail column with the given text; gallery of every image in
`public/work/capstone/` with arrows / thumbnails / arrow keys and a glass wipe; route
`/work/capstone` (metadata, OG, sitemap, deep link, Back / Esc to Depth); focus handling;
phone. Sheet `loop1-capstone.jpg`.

**Stage 7 — no thin frames, no overlaps.** Timing and density envelopes only (the looks stay
locked): `journey/GoldCloud.tsx`, `journey/DustSheet.tsx`, the tagline dust / wireframe
hand-over, `journey/Trails.tsx`, `depth/DepthBubbles.tsx`, `journey/ContactEmbers.tsx`,
`hero/Emblem.tsx` (Contact pose). Every element overlaps the next by ≥ 0.4 of the range; The
Core never over "LET'S TALK". Strips `loop1-transitions.jpg`.

**Stage 8 — production and polish checks.** The toolbar pill, brand/OG images, a keyboard and
screen-reader pass, one mouse "voice" from `motion/motion.ts` (camera lag, particle return,
card tilt), phones at 390×844, 375×667, 430×932.

**Gate**, then the final report here and as the last message.

## LOCKED (unchanged this loop)
Statement layout, tagline + dust + wireframe look, card tone / grade / frost / bevel, card
titles (Departure Mono, two lines), card face layouts, Bliggit, System graph and labels, Depth
layout and palette (only the capstone interaction in Stage 6 is unlocked), Contact layout, the
loop back to the hero, the scramble / glitch rules, UI copy and content, SEO structure, legal
pages, CV, the tier system, performance work. The phone number only on /impressum.

## Decisions I made
- **The light drift lives in The Core's material, not in the light-formers.** A former's colour
  only reaches the glass when the cube map re-renders (the HD 630 dip found earlier). The drift
  is a per-frame tint on The Core's reflections (cool → warm copper → cool, `lightDrift`, 9 s);
  the coloured formers are baked once and re-bake only while they fade in or out along the path.
  The hero's old warm pulse (a cube-map re-render every frame of it) is gone; Contact's held
  warmth still re-bakes as before. Lite: no drift, a constant warm tint on grazing rims.
- **The rim's rainbow is a hue ramp gated by a travelling spot.** The physical thin film alone
  read pastel (the grade's per-channel shoulder whitens bright lines); the full ramp all round
  read as a neon RGB ring. Final: a faint film tint all round, vivid where a cut mirrors one
  fixed direction, so the spot slides along the rim as The Core turns (MOTION.md §1).
- **"The teal bleed bottom-left"**: the backdrop isn't unlocked in Stage 1, so the corner bleeds
  are unchanged (our lower left is violet, as before).
- **Hero dust** stays the existing glitter grains, spread wider and sparser round and behind The
  Core; the glass look comes with Stage 3 (one shader for every place).
- **Lite captures.** The tier drops to lite only when a run measures < 55 fps, which the HD 630
  rarely does, so lite was never guaranteed in captures. A measurement-only hook
  (`window.__tier`, set by the scripts' `TIER=lite`) starts a visit on lite; the tier system
  itself is unchanged.
- **The blades' glass is faked in the opaque material** (a dark see-through body, the film
  glowing along the rim), not real transparency: a transparent spine is sorted against the
  additive grains by object distance and would overwrite grains in front of it; fixing its draw
  order needs `Spine.tsx`, which this stage doesn't unlock.
- **"Plate edges"**: after the carving a plate's edge can't be told from its face, so every
  edge seen at a grazing angle takes a little of the glass (35%); the blades take all of it.
- **"Before" captures** come from a scratch worktree of the previous stage's tag, built and
  served on port 3101 (phones need a wasted first frame: the first jump can land at the hero).
- **Grains are glass chips, not hollow beads.** Stage 3 B asks for a "dark body, thin bright
  rim" bead; built literally, at 3–10 px it read as soap bubbles. The reference's pockets
  (zoomed 3×) are filled, faceted chips of glass, so the body is filled and tinted (each facet
  lit its own way, a slightly darker see-through middle), with the thin film-tinted rim, the
  ~0.5 px fringe and the glint on top. Similarity to the reference decided.
- **Refraction is a caustic, not a sample.** There is no scene buffer at most places (three's
  transmission target exists only while The Core's glass is drawn), so on the full tier each chip
  shows the light it lets through focused on its far side; lite drops it.
- **One field for every grain**: the glitter (Work pockets, hero and statement dust, System
  dust), the atmosphere layers, the trail / wall / plankton motes and the rising embers and beads
  share one fragment include (`glassGrain.glsl`), one vertex include (`grainMotion.glsl`) and one
  set of uniforms (`particles/CursorField.tsx`). The gold cloud and the statement's slab share
  the motes shader but keep their own look (a GRAIN define): the statement look is locked.
- **No stirring over a hovered card on desktop, but on phones only over an open card**: phones
  keep the card in view focused (it scrambles), so the hover gate would have switched the touch
  push off at Work.
- **Phone captures tap to start the 3D.** A scripted wheel tick on an emulated phone leaves
  Lenis in a smooth scroll that pulls every later jump back to the top (the "first jump lands at
  the hero" quirk of earlier rounds). Real phones scroll by touch and never see it; the scripts
  now tap instead (`scripts/*.mjs`).
- **Stage 4: one side of the camera line for every card.** With the spacing closed up, the
  old alternating left / right poses stacked each left card into the right card above it at
  nearly the same place round the column (they cut through each other in 114 of 121 simulated
  frames). A regular helix keeps 54° between neighbours round the column instead.
- **Stage 4: the card comes forward, the camera holds** (`WORK.dolly` 0, `APPROACH` 12% in
  `layout.ts`). A camera dolly brings every card nearer at once; a card coming forward at its
  stop is always in front of its neighbours, so its face is never covered.
- **Stage 4: the pockets keep their placement rule** (same count, hues, split, the same
  formula); its inputs follow the new path (the camera's angle at each height, the cards' new
  poses), so the pockets keep wrapping the column where the camera looks.
- **Stage 5: the open card's height on 16:10 is 66.5%, not 70–75%.** The card is 16:10 like
  the screen, and the space right of the details column is ~67% of the width, so a 72%-tall card
  would be cut by the frame or laid over the details. It is 72% where it fits (16:9 and wider)
  and as tall as fits otherwise (`openFrame` in `WorkCards.tsx`).
- **Stage 5: on phones the details panel scrolls within half the screen.** Bliggit's details
  (with its login screenshot) were taller than the space under the opened card and covered it
  (before and after this loop); the panel now holds at most 50svh and scrolls, so the card
  above stays clear (Close stays reachable by scrolling, Esc and Back).
- **Stage 6: the capstone shares the work store's open state** (`opened` = "capstone"): one
  open / close / URL system for the cards and the panel (Back and Esc work the same), and the
  cursor field and the job cards already treat any open card alike. Work's HTML only shows a
  job's details; Depth's shows the capstone's.
- **Stage 6: both images in `public/work/capstone/` are in the gallery.** The dashboard (its chart
  crop, as the cover) and the medallion flow (whole, centred): both sit on dark grounds, so
  neither glares in the scene. The list comes from the folder at build time (`/assets.json`),
  so a new screenshot dropped in appears after the next build; alt texts by file name live
  with the content (`capstone.galleryAlt`).
- **Stage 6: the capstone's close reads "← Close (Esc)"** as the brief gives it (the job cards'
  details keep "× Close (Esc)").
- **Integrated-GPU numbers need pauses.** Back-to-back runs on the HD 630 drift down by 5–15 fps
  (heat, GPU switching): the same build measured 44–52 at the hero in a long sequence and 60 with
  20 s pauses. Before / after comparisons are now alternated with pauses (`ab.sh` in the session
  scratchpad: `fps-place.mjs` on :3101 and :3100 in turn).
- **Stage 7: strips at exact progress, without the soft magnet.** After a scroll the page eases
  to a nearby key moment; in the earlier captures that carried frames half-way through a
  transition on to the next place (4.4 showed Depth, 5.6 Contact). The capture and frame-rate
  scripts now switch the page to keyboard input first (a synthetic key event; nothing
  scrolls), which turns the magnet off.
- **Stage 7: "overlap each element with the next by ≥ 0.4 of the transition range"** is read
  per hand-over: the transition range is the outgoing element's fade (in progress), and the
  incoming one is present (≥ 25% of its own peak, in frame) over at least 40% of it.
- **Stage 7: the gold cloud's balance.** Held by the scroll, the cloud's peak showed for the
  first time as a still frame: a bank of beige smoke, where seg_12's cloud is mostly fine gold
  dust with faint smoky wisps. Its dust / smoke strengths changed (3 → 6, 0.6 → 0.2), not its
  shaders or colours.
- **Stage 7: The Core comes into Contact from above and holds its place in the frame** (the
  brief's first option, "above the headline's bounding box with a margin"): it never sits lower
  on the screen than at rest, and the words rise into theirs from below, so the two never meet.
  CLAUDE.md's "rising out of the dark" is kept as appearing out of the dark.
- **Stage 7: "LET'S TALK" leaves with the scroll.** A timed fade can't keep fast scrolls clean
  (the words start moving up as the loop starts), so they fade with the scroll over the last
  fifth of a screen of their pinned stretch, unless something in them has keyboard focus. The
  Contact layout is unchanged.
- **Stage 7: phone-only density.** Phones see System → Depth from 20–30 units and frame the
  statement and System tall and narrow: the trails follow the phone layout (System and Depth
  centred), the data trail is wider and denser there, the statement's dust draws in sideways
  like The Core, and more clouds of the same grains fill the dark bands. Desktop is unchanged.
- **Stage 7: phones measure EMPTY AREA turned a quarter.** compare-frames reads every frame at
  1440×900; a portrait frame squeezed into it gets 4:1 tiles, so `empty-area.mjs` turns it
  first (the share of empty tiles barely moves: within 2%).
- **Stage 8: the Vercel toolbar is switched off in the dashboard, not in code.** Vercel documents
  the production switch only as a dashboard setting (team or project, Settings → General →
  Vercel Toolbar); visitors never get the toolbar, so turning it off for the owner is left as one
  click for you (Stage 8, item 1).
- **Stage 8: the open views are modal.** The brief asks them to trap focus; a trap without
  `aria-modal` would contradict what screen readers are told, so both now say
  `aria-modal="true"`. On /work/<slug> the card is open on arrival, so Tab starts inside it; Esc
  or Close returns to the page.
- **Stage 8: one damping for the cursor's family.** ζ 0.8 for everything the mouse moves (the
  pointer spring at 0.45 Hz for the camera and every tilt, the air at 0.8 Hz for the grains):
  between the old 0.85 and 0.7, a 1.5% overshoot, no bounce.
- **Stage 8: the phone sheet leaves /impressum out**: it carries the phone number, which stays on
  that page only (its text is still checked for clipping).
- **Gate: one dependency warning goes through three's console hook.** React Three Fiber 9.8 (the
  latest stable, 9.8.2 too) still builds a THREE.Clock, which three deprecated in r183: one
  warning on every visit about code the site can't change. three's documented
  `setConsoleFunction` now passes every message through except that one (`threeConsole.ts`,
  to be removed with Fiber 10). The earlier round had listed it as "left alone"; the gate asks
  for a clean console.
- **Gate: the card faces read their pixels back**, so their background's 2D context is created
  for frequent reads (`willReadFrequently`); Chrome's hint is gone and nothing drawn changes.
- **Gate: shaders are compiled for where they are drawn.** The scene draws into the effect
  composer's HDR target, and three picks a shader's variant by where it draws (in a target: no
  tone mapping, linear output). Every precompile compiled the screen variant, so the variant in
  use still compiled, and stalled the frame on a shader link, the first time a place came into
  view (traced on the HD 630: 23–51 ms in `GetProgramiv`, frames of 70–167 ms). The hero's
  warm-up, the spine, the live card scenes and now every deferred place (on mounting, its
  textures uploaded too) compile for a target (`compile.ts`).
- **Gate: lighter dust walls on lite.** Flying through a wall between places was the heaviest
  moment of a fast scroll on the HD 630 at Retina; on lite each wall draws 60% of its motes,
  capped smaller. Full is unchanged.
- **Gate: The Core's detail maps are drawn just after the first frame.** Loop 1 had raised the
  desktop Lighthouse score's blocking time from 170–190 ms (91–93) to 270–310 ms (84–86): the
  hero's mounting task grew by the Stage 1 engraving, the bigger band and, most, a noise field
  of ~1M samples for the smudges and the film, all drawn texel by texel while the page loads.
  The maps now start at their plain values (clean glass, no film, flat normals: the same
  shader, nothing recompiles) and get their detail in an idle moment right after, while The
  Core is still resolving out of the intro's dust. With the band built straight into typed
  arrays, the texels written without an array each, and every precompile on the right variant
  (above), desktop scores 94–96 (130–140 ms).
- **Gate: the statement's dust sheet stops being drawn at toWork 0.5** (was 0.85): it is above
  the frame from about 0.3, and its smoke field kept rendering while Work came into view.
- **Gate: a card's title scrim is measured once per media**, not on every redraw: the title
  scramble redraws its layer each frame for ~1.5 s, and each redraw read the media's pixels
  back (the cache was declared and never used).
- **Gate: on lite, the cards' live scenes hold still while the camera rushes** down the column
  (faster than 3 units/s, a fast scroll; a card-to-card step stays under it): they are frosted
  and flying past. An open card always plays.

## Stage 1 — the hero (tag `loop1-stage-1`)
Files: `hero/bandGeometry.ts`, `hero/glassTextures.ts`, `hero/glassMaterial.ts`,
`hero/HeroLighting.tsx`, `hero/Emblem.tsx`, `hero/HeroAura.tsx`, `hero/motion.ts`,
`shaders/heroSpark.*`, `shaders/heroShard.frag`, `styles/scene.ts` (`light`, `film`,
`formers`), `dev/DevTools.tsx` (sliders), the labs (no hero formers at Work / System), the
measurement hook in `stores/tier.ts`; tools `scripts/capture-moments.mjs`, `scripts/fps-place.mjs`.
1. **Iridescent rim.** The bevels, the new grooves and (a little) the side walls carry a thin
   film whose thickness runs along the outline (260–560 nm, one hue cycle per 1.6 units), and
   a hue ramp (aqua, green, gold, pink, blue) held under the grade's shoulder; vivid in one
   travelling spot, a faint tint elsewhere; the key's hot sparkle stays white. Coloured
   light-formers in the hero environment: teal low left, violet right, amber low right (each with
   its twin half a turn round, so the edge-on hand-over stays seamless); they fade out on the way
   to Work.
2. **Detail.** A crisper inner chamfer (0.015 → 0.02), a fine V-groove cut into each face just
   inside it (the second thin inner edge, catching the edge light as two hairlines), and engraved
   micro-lines on the wide faces (a mipmapped normal map: seven wandering hairlines).
3. **Light drift** (full): cool → warm copper → cool every 9 s, ~2 s above half strength, as a
   tint in the material. Lite: static cool environment, gentle warm tint on grazing rims.
4. **Living space.** The halo behind The Core is a whisper (about 35% of before, 60% of that on
   portrait); the dust is a wider, sparser field of eight loose clouds round and behind it (never
   in front of its centre); 14 gold and pink sparks rise slowly behind and beside it; three thin
   glass arcs far behind (z −7 to −13), soft and faint, a glint running along each every 9–13 s.
5. Kept: the intro burst, the 1.5× scale, the corner bleeds.

Sheet: `docs/screens/loop1-hero.jpg` (at_01 and seg_00 at 1.0 / 4.5 / 6.5 s | now | new at 0,
1.9, 3.8 and 5.7 s of the idle turn; phone now | new). The copper moment falls where the scene
clock puts it (1.9 s in the "new" run).

Self-review against at_01 / seg_00:
- Closer: the rim carries colour; a rainbow zone (pink, gold, green, blue) slides along the bevels
  as The Core turns, the rest silver with a faint film; a warm copper moment comes once a cycle.
- Closer: the space is darker round The Core (no teal wash, also on phones), alive with sparse
  dust, rising sparks and faint far arcs; The Core stays the one subject.
- Closer: the groove and crisper chamfer read as cut, crafted glass at 1.5× crops.
- Still different: their ring is darker glass (grey body, thin bright rim); ours keeps the
  bright-cut white bevel lines, so it reads lighter overall.
- Still different: their dust is olive / green bokeh discs of many sizes; ours is fine pale dust
  (Stage 3). The engraved lines are below a pixel at the hero's DPR cap (1.25): texture, not lines.

FPS (production, Retina): idle hero 59.9–60.3 on both GPUs (full), lite on the HD 630 59.9–60.3;
statement 59.9–60.3 on both.

## Stage 2 — the column (tag `loop1-stage-2`)
Files: `work/spineGeometry.ts`, `work/oilMaterial.ts` (the worker builds whatever the geometry
returns; `shaders/oil.glsl` unchanged).
1. **Slimmer core.** The plates are two thirds of their old width and depth; the necks pinch to
   50–56% of the lobe (were 62–68%) and the lobe falls away faster, so the bodies are chunky only
   at their centres. Lumps on 30% of the bodies (were 60%), smaller.
2. **Processes.** On ~85% of the vertebrae, 2–4 wing-like blades round the belly at different
   heights and turns: leaf-shaped (broad near the root, tapering to a point), mostly upright so
   the camera sees their broad sides, curving sideways and dropping towards the tip, reaching
   0.5–1.0 past the surface (0.6–1.2× the core). Rooted inside the lobe and shaped by the same
   vertebra and column deformation. A `thin` attribute runs 0 → 1 along each blade.
3. **Glassy edges.** Full: the blades (and a little every edge at a grazing angle) read as tinted
   glass, a dark body with the 2c film glowing along the rim; rougher, so their edges don't alias.
   Lite: the rim tint only. The core stays dark chrome with the 2c film.
4. **Moving light.** The key highlights still slide with the orbit; a soft band of light (film-
   tinted specular) runs down the whole column every 7 s.
5. **Outline glints.** No hot highlight or glitter right at the silhouette, rougher blades, the
   blade tips dimmed.

Passes: (1) slim core + thin curved spurs: they read as hooks; broadened into upright leaf-shaped
fins and the sweep softened (2) and (3) softer, dimmer blade rims against SPARKLE. Each pass was
closer on the sheet; none reverted.

### Metrics (column + air)
| Metric | Reference | v1-chrome | Pass 1 | Pass 2 | Pass 3 (final) |
|---|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 34.6 (+22% ✗) | 34.3 (+21% ✗) | 33.9 (+19% ✗) | 33.7 (+19% ✗) |
| Contrast (luma std dev) | 21.2 | 28.4 (+34% ✗) | 27.1 (+28% ✗) | 26.7 (+26% ✗) | 26.6 (+25% ✗) |
| 5th percentile | 10.8 | 13.4 (+24% ✗) | 13.7 (+27% ✗) | 13.8 (+28% ✗) | 13.6 (+25% ✗) |
| 95th percentile | 70.8 | 93.9 (+33% ✗) | 91.7 (+29% ✗) | 90.6 (+28% ✗) | 89.8 (+27% ✗) |
| Mean saturation | 0.427 | 0.427 (+0% ✓) | 0.443 (+4% ✓) | 0.443 (+4% ✓) | 0.445 (+4% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 37.5 (-27% ✗) | 38.4 (-25% ✗) | 38.3 (-25% ✗) | 38.5 (-25% ✗) |
| SPARKLE (points / MP) | 341 | 775 (+127% ✗) | 890 (+161% ✗) | 858 (+152% ✗) | 835 (+145% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.22 ✗ | 0.23 ✗ | 0.23 ✗ | 0.23 ✗ |

(v1-chrome re-recorded this session: the same code at Work as detail 2c's final, 34.6 / 37.5% /
775 here vs 34.2 / 37.6% / 793 then.) JSON: `docs/screens/metrics/loop1-column/`.
- Luminance improved (34.6 → 33.7) and EMPTY AREA moved toward 51% (37.5 → 38.5%), as required.
- **Open: SPARKLE rose 775 → 835/MP (+8%).** The sparkle map shows the extra points as dotted
  chains along the blades' edges (thin bright lines count as points; no multisampling at Work);
  three passes softened them (890 → 858 → 835). Note: the HTML job list and the e-mail line count
  as points in every run (the metric's crop doesn't exclude them).
- EMPTY AREA barely moves with the column: most non-empty tiles at Work are the bead pockets
  (Stage 3).

Sheet: `docs/screens/loop1-column.jpg`: reference column crops (28, 31, 41, 48.5 s) | v1-chrome |
new at 75°, 105°, 195°, 225° (between the stops), desktop full, desktop lite (forced), and the
phone (v1 | new).

Self-review against at_04–at_07:
- Closer: a slim spine with wing-like blades reaching out and down; the outline is spiky and open,
  with dark gaps between the blades, where v1 was a solid pile ~20% of the frame wide.
- Closer: the blades read as tinted glass with teal / pink rims; a soft light passes down the column.
- Closer on phones: a slim finned spine behind the cards instead of a heavy chrome mass.
- Still different: their vertebrae are more intricate and colourful all over (pink / teal / green
  speckle); ours keeps 2c's dark chrome lobes, which still read as rounded bodies in places.
- Still different: SPARKLE (above).

FPS (production, Retina, at Work): full 59.9–60.3; HD 630 59.9–60.4; HD 630 lite 59.9–60.4;
phone 390×844 59.9–60.

## Stage 3 — one glass-particle system (tag `loop1-stage-3`)
Files: new `particles/CursorField.tsx` (the cursor field, the stateless push, the parallax and
each place's light), `shaders/glassGrain.glsl`, `shaders/grainMotion.glsl`,
`shaders/cursorField.vert/.frag`, `journey/StatementDust.tsx`, `system/SystemDust.tsx`; changed
`shaders/glitter.*`, `atmosphere.*`, `grain.frag`, `motes.vert`, `bubble.vert`, `ember.frag` →
`risingGrain.frag`, `work/Pebbles.tsx`, `journey/Atmosphere.tsx`, `journey/motes.ts`,
`journey/DustTrail.tsx`, `journey/ParticleWall.tsx`, `journey/ContactEmbers.tsx`,
`depth/DepthWorld.tsx`, `depth/DepthBubbles.tsx`, `system/SystemPlace.tsx` (mounts the dust),
`motion/motion.ts` (`MOTION.air`), `Scene.tsx` (mounts the field and the statement dust); tools
`scripts/shader-check.mjs` (production hides shader errors: this hooks WebGL's compile calls and
prints any error in context), `fps-place.mjs` (MOVE=1, main-thread time), `capture-moments.mjs`
(swipes), the phone tap in every script.

A. **Sizes and brightness.** ~75% tiny points, ~20% small chips, ~5% medium and large; per-grain
   brightness mostly dim with a few bright, the slow twinkle kept; tiny points soft, not hot
   pixels. Pockets: denser at the core (r^1.4), lobed outlines that trail into wisps, chips 2.1×
   the column dust; bokeh away from the focus on full (as before).
B. **Glass look.** Every grain from ~3 px up is a faceted glass chip: 5–7 facets each lit its own
   way, a darker see-through middle, a thin rim tinted by thin film (teal → pink → gold by angle),
   a faint red / blue fringe, one glint up-left; full tier: a caustic on the far side (the light
   it lets through). Glints flare as each chip tumbles through the light, on its own phase.
C. **Light.** Each place has a light direction and colour (hero key, Work's upper left, System
   from above, Depth's surface, Contact's warm upper right); glints take its colour (copper in the
   hero's warm moment). At Work the column's 7 s light sweep passes through the air too: grains
   in the band brighten and take its pink / teal for a moment. Depth's plankton flares as the
   caustic web passes over it.
D. **Cursor.** Full: a 128² spring field in screen space; the cursor's path kicks the springs it
   passes (pushed aside, a slight swirl, a little along its motion, scaled by its speed) and they
   settle on `MOTION.air` (0.8 Hz, ζ 0.7: ~1.1 s, ~5% overshoot), leaving a short trail; disturbed
   grains glint. Near grains move more than far ones; the whole field shifts ~1.5% against the
   cursor on the camera's pointer spring. Lite and phones (touch drag): a stateless push round the
   cursor that eases out on the same spring. Off with reduced motion, while scrolling, over a
   hovered / open card and over the text column.
E. **Every place.** Hero: the Stage 1 dust as glass chips. Statement: loose dust behind the tagline
   and just behind The Core's slit (its glass bends the grains). Work: the pockets (same count,
   positions, hues, 90/10) plus half the 10% dust spread wide between the cards. System: fine
   dust through the constellation at several depths, brighter near every filament and much
   brighter along the threads lit on hover. Depth: the plankton as glass chips catching the
   caustics, 16 larger beads rising with the bubbles. Contact: 110 warm embers round The Core and
   behind the headline, fading over the text.

Passes (against the Work metrics and the sheets): (1) the system as above; (2) softer, dimmer tiny
points and a gentler sweep tint (SPARKLE); (3) pocket chips 1.5× → 2.1× (closer to the
reference's chip size, fewer isolated points). Each closer on the sheet; none reverted.

### Metrics (Work, column + air)
| Metric | Reference | Stage 2 (final) | Stage 3 pass 1 | Pass 2 | Pass 3 (final) |
|---|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 33.7 (+19% ✗) | 30.7 (+8% ✓) | 30.6 (+8% ✓) | 32.4 (+14% ✓) |
| Contrast (luma std dev) | 21.2 | 26.6 (+25% ✗) | 26.3 (+24% ✗) | 26.2 (+24% ✗) | 28.5 (+35% ✗) |
| 5th percentile | 10.8 | 13.6 (+25% ✗) | 13.6 (+26% ✗) | 13.6 (+26% ✗) | 14.0 (+30% ✗) |
| 95th percentile | 70.8 | 89.8 (+27% ✗) | 86.0 (+21% ✗) | 86.4 (+22% ✗) | 94.2 (+33% ✗) |
| Mean saturation | 0.427 | 0.445 (+4% ✓) | 0.436 (+2% ✓) | 0.440 (+3% ✓) | 0.428 (+0% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 38.5 (-25% ✗) | 46.0 (-10% ✓) | 48.1 (-6% ✓) | 45.7 (-11% ✓) |
| SPARKLE (points / MP) | 341 | 835 (+145% ✗) | 1232 (+261% ✗) | 1184 (+247% ✗) | 1030 (+202% ✗) |
| Hue distance (TV, 0–1, ≤ 0.15 ✓) | 0 | 0.23 ✗ | 0.30 ✗ | 0.30 ✗ | 0.29 ✗ |

- EMPTY AREA reached the reference's character (45.7% vs 51.1%; was 38.5%): the pockets are now
  clusters of chips with dark between them, not overlapping discs. Luminance is in range.
- **Open: SPARKLE 835 → 1030/MP.** Glitter made of separate chips counts each chip as a point;
  the sparkle maps show them in the pockets (plus the HTML list and the card edges, as in every
  run). Larger pocket chips (pass 3) brought it down from 1232.
- **Open: hue distance 0.23 → 0.29**: more cyan, less violet than the reference (the chips' film
  rims and the sweep tint lean teal; the pockets keep their hues, as required).

Sheets: `docs/screens/loop1-particles.jpg` (each place, now | new, full frame and 3× crop),
`docs/screens/loop1-pockets.jpg` (four pockets, reference | now | new, 1× and 3×),
`docs/screens/loop1-cursor.jpg` (a swipe through a Work pocket: before, end of swipe, +0.5 /
+1.0 / +1.5 s; full field, lite push, phone touch drag).

Self-review against at_04–at_07 and seg_44:
- Closer: the pockets are glitter of faceted glass chips at many sizes, dense cores thinning to
  wisps, instead of polka-dot discs; the space round every subject is alive (System's dust, the
  statement's, Contact's embers) and still dark between clouds.
- Closer: the air answers the cursor: a pocket parts round a swipe and drifts home in ~1.5 s.
- Still different: the reference's pockets mix several hues in one cloud and are denser; ours keep
  one hue per pocket and the same grain count (both locked).
- Still different: SPARKLE and hue distance (above).

FPS (production, Retina, cursor moving constantly): full tier (discrete GPU) 59.9–60.4 at every
place; HD 630 lite at Work and the hero 59.4–60.4 in alternated runs with pauses, the same as the
Stage 2 build. Long back-to-back sequences on the HD 630 dip to ~50 for both builds (heat).

## Stage 4 — gallery composition (tag `loop1-stage-4`)
Files: `work/layout.ts` (spacing, spiral, poses, `APPROACH`), `journey/path.ts` (no dolly, the
camera's aim height), `work/WorkCards.tsx` (the card coming forward at its stop),
`shaders/frost.frag` (full tier: depth of field on cards out of focus); tools
`scripts/count-cards.mjs` (cards per frame from the recorder's projected corners, which
`record-work.mjs` now saves) and a scratch simulation of the Work path (`gallery-sim.mjs`, same
math as `path.ts`, `layout.ts`, `CameraRig` and `WorkCards`) used to search layouts against four
constraints: 3–4 cards per frame, the focused card 50–55% wide and never covered by a nearer
card, no two cards intersecting in 3D (with the hover lift), the HTML list zone clear.
1. **Tighter spiral.** 54° between neighbouring cards (was 60°), 1.45 units apart (was 2.1);
   the Work scroll length is unchanged, so the camera moves less per card. All cards hang on the
   same side of the camera's line (a regular helix): the previous card up to the left, the next
   down to the right and further round, the one after behind the column.
2. **The focused card dominant.** At its stop the card comes 12% of the way towards the camera
   (the camera no longer dollies in): ~53% of the frame width, always in front of its neighbours.
   Neighbours sit at clearly different depths (simulated 3.8 vs 4.6–6.1 units). Full tier: a
   neighbour's title and edge line soften with its media (depth of field); lite: the existing
   dimming of cards away from the camera's height.
3. **List zone.** Nothing hangs low on the left; the bottom-left list stays clear of card faces.

Target: **3–4 visible cards in 100% of recorded Work frames** (53 frames: 25 with three, 28 with
four; before: 26%, mostly two). Widest card: median 53% of the frame width.

Sheet: `docs/screens/loop1-composition.jpg` (at_04, at_05, at_06, at_07, at_09 and a seg_44 tile
| Stage 3 at the six stops | new at the six stops).

Self-review against at_04–at_09 and seg_44:
- Closer: walking through a gallery: at every stop the card in focus dominates, its neighbours
  are cut by the frame's edges at other depths, often a fourth card behind the column.
- Closer: depth reads at once: neighbours are smaller, softer (media, title and edge) and dimmer.
- Still different: the reference fans its neighbours out to the left and right edges at steep
  angles (streaked titles); ours sit above-left and below-right, a helix more than a fan.
- Still different: their focused card often sits dead centre; ours sits right of centre (the
  details column lives on the left).

FPS (production, Retina, alternated with Stage 3 with 30 s pauses, HD 630 lite at Work): still
57.5–60 vs Stage 3's 57.9–60.3; cursor moving 56.0–60.4 vs 56.4–60. Full tier (discrete GPU):
59.7–60.4 still and moving.

## Stage 5 — the opened card (tag `loop1-stage-5`)
Files: `work/WorkCards.tsx` (the open frame, square to the screen, almost no tilt; the dust's
glass look; the measurement corners include the open card), `shaders/frost.frag` (the open
grade), `shaders/cardDust.vert/.frag` (the dissolve as the world's glass chips),
`shaders/glassGrain.glsl` (`grainBody`, the chip's outline for normal blending),
`components/work/WorkDetail.tsx` (phones: the details scroll within half the screen); tools
`scripts/capture-open.mjs` (each card via its /work/<slug> page), `capture-opening.mjs` (an
opening and closing in time), `card-tone.mjs` (closed vs open brightness and saturation inside
the card), the capture scripts save the card's corners.
1. **Open state.** Desktop: centred in the area right of the details column, a touch below the
   middle (the top clears the section indicator), 72% of the frame height where that width fits
   (66.5% on 16:10), never cut. Square to the screen (the camera's own orientation: no
   keystone), the idle and cursor tilt cut to 15% (≤ ~2°).
2. **Open media.** Sharp, in the family grade: the brightest, most saturated fills (the live
   scenes' neon mint) pulled back towards the family's tones and the whole a little dimmer. The
   single light sweep is kept.

| Card | Closed luminance | Open luminance | Open / closed | Closed saturation | Open saturation |
|---|---|---|---|---|---|
| bliggit | 56.6 | 79.1 | 1.40× | 0.29 | 0.30 |
| kuehne-nagel | 46.3 | 62.7 | 1.35× | 0.42 | 0.40 |
| adesso | 39.4 | 49.9 | 1.27× | 0.34 | 0.32 |
| eon | 51.8 | 71.8 | 1.39× | 0.44 | 0.45 |
| licht-und-schatten | 40.6 | 55.2 | 1.36× | 0.24 | 0.25 |
| freelance | 45.5 | 57.6 | 1.27× | 0.40 | 0.40 |

   (Before: 1.33–1.53×, Bliggit 1.53×, E.ON 1.45×.)
3. **Dissolve.** Opening and closing keep the particle dissolve (defrost from the edges in, the
   glass breaking away); its dust is now the world's glass chips (`glassGrain` with the chip's
   own outline as alpha), each tinted by the spot of the image it broke from, about twice the
   size and longer-lived, streaming off to the left as in at_08. Checked on all six cards.
4. **Phone.** The opened card spans 85% of the width in the upper part, the details below; all
   six fit, nothing cut (Bliggit's details no longer cover its card).

Sheet: `docs/screens/loop1-open-card.jpg` (at_08 | now | new for the six cards on desktop, a
dissolve frame; the six on the phone, now | new).

Self-review against at_08 / at_09:
- Closer: the opened card faces the viewer head on, calm and large in the space right of the
  details, the details in small mono at the left with ← Close.
- Closer: the open media stays dark-glass family (≤ 1.40× the closed card, the same saturation);
  no neon panels.
- Closer: the card breaks into image-coloured glass chips that stream off to the left.
- Still different: their dissolve is a dense, opaque cloud of large chips; ours is thinner.
- Still different: around their opened card the scene falls into smoke; ours keeps the dimmed
  column and neighbours behind it.

FPS (production, Retina, a card open): 59.9–60.3 on the discrete GPU, the HD 630 and the HD 630
lite.

## Stage 6 — the capstone opens (tag `loop1-stage-6`)
Files: `depth/CapstonePanel.tsx` (hover, open, dissolve, gallery), `depth/DepthPlace.tsx` (the
word fades while it is open), `components/depth/CapstoneDetail.tsx` (new: the detail view),
`components/depth/DepthPanel.tsx` (the "Capstone · AI × Work" line is a button),
`sections/DepthSection.tsx`, `sections/Home.tsx`, `work/WorkSection.tsx` (arriving at
/work/capstone flies to Depth), `work/useWorkUrl.ts`, `stores/work.ts` (`gallery`),
`app/(site)/work/[slug]/page.tsx`, `proxy.ts`, `app/sitemap.ts`, `app/assets.json/route.ts`
(the gallery list), `canvas/assets.ts`, `content/site.ts` (`galleryAlt`), `work/cardFace.ts`
(a crop per image, whole images centred), `work/WorkCards.tsx` (the dust, open frame and timing
shared), `shaders/frost.frag` (`uWipe`: inactive on the job cards); tool
`scripts/capture-capstone.mjs`.
1. **Hover.** The panel tilts towards the cursor, grows a little, the frost thins round the cursor
   (the cards' defrost spot) and the cursor reads "OPEN".
2. **Open.** A click on the panel, Enter on the "Capstone · AI × Work" button, or its URL: the
   panel flies in exactly like a job card (Stage 5's frame: right of the details, square to the
   screen, 66.5–72% of the height), defrosts behind the particle dissolve (glass chips) and shows
   its media sharp in the family grade; the lattice, roots and water stay round it (Depth's
   palette).
3. **Details** (left, small mono, the job cards' layout): the programme line, "AI × Work —
   Capstone", the one-liner, the data stack (Python, dbt, PostgreSQL (Neon), Cloudflare R2,
   Apache Airflow, Docker, Streamlit, Plotly), the gallery controls, "Repository on GitHub ↗",
   "← Close (Esc)".
4. **Gallery.** Both images of the folder (dashboard chart, medallion flow): arrows, thumbnails
   (desktop), ← / → keys, or a sideways swipe (phones); a band of frost crosses the pane and the
   image changes behind it (0.7 s). The counter is a polite live region with the image's
   description.
5. **Route.** /work/capstone: prerendered, its own title and description, the shared OG image,
   in the sitemap; deep-linkable (it opens on load and the camera flies to Depth); Back and Esc
   close it and return to / at the same scroll position (checked: 9900 → 9900).
6. **Accessibility.** The opener is a real button; focus moves into the dialog when it opens and
   back to the button when it closes (checked); Esc closes; the dialog is labelled by its title;
   screen readers get the same text as the panel.
7. **Phone.** Opens across the width in the upper part, the details below (scrolling within half
   the screen), the gallery swipeable (checked: 01 → 02).

Sheet: `docs/screens/loop1-capstone.jpg` (desktop: closed, hover, opened with the dashboard and
with the medallion flow, closed again; phone: the deep link opened, then after a swipe).

Self-review against at_08 / at_10–at_11 (the reference's Lab panel opens a page; ours opens in
place, like its project cards):
- Closer: Depth is no longer a dead end: its panel answers the cursor and opens like the cards,
  in the same glass and grade.
- Closer: the capstone's real dashboard reads sharp in the scene, not as a glare.
- Still different: a dissolve as dense as the reference's (Stage 5's note) is still to come.

FPS (production, Retina, the capstone open): 59.9–60.4 on the discrete GPU, the HD 630 and the
HD 630 lite.

## Stage 7 — no thin frames, no overlaps (tag `loop1-stage-7`)
Files: `journey/GoldCloud.tsx`, `journey/FormMoment.tsx`, `journey/Tagline.tsx` and
`shaders/taglineDust.vert` (the dust lingers), `journey/Trails.tsx`, `journey/DustTrail.tsx`
(mote size), `journey/StatementDust.tsx`, `system/SystemDust.tsx`, `depth/DepthBubbles.tsx`,
`depth/DepthPlace.tsx`, `journey/ContactGlow.tsx`, `journey/ContactEmbers.tsx`, `hero/Emblem.tsx`
(the way into Contact), `journey/path.ts` (`view`; `contactEntry`, `contactRest`, `contactDrop`),
`CameraRig.tsx` (publishes its height and gaze), `motion/Drift.tsx` (its drag, readable),
`sections/ContactSection.tsx` (the words leave with the scroll), `canvas/measure.ts` (new,
measurement only); tools `scripts/empty-area.mjs` and `scripts/contact-overlap.mjs` (new),
`scripts/capture-progress.mjs` and `scripts/fps-place.mjs` (exact progress, no magnet).
1. **Hero → statement.** The gold cloud still blooms on the first scroll (0.35 s), but is then
   held by the scroll instead of a fixed 1.5 s: it comes three quarters of the way down with the
   camera and fades as the camera passes through the dust sheet (camera 0.5 → 0.82). At its
   peak it is mostly fine gold dust with faint wisps (seg_12), not a bank of smoke; lite draws
   one wisp layer of three.
2. **Statement → Work.** The tagline's dust fades on a slower clock (toWork ÷ 0.6 instead of
   ÷ 0.3; the letters break up exactly as before), so it is still dense as the wireframe forms.
   The wireframe forms a little earlier (toWork 0.15) and stands while the camera holds (to
   0.68, at least 2.3 s); before, it scattered after 2.8 s even with the camera at rest, leaving
   an empty frame. The descent's trail starts at the hold (toWork 0.35, was 0.55): the dust
   streams down from the wireframe to the spine.
3. **Work → System.** Unchanged and checked: the chips trail is at full strength from toSystem
   0.14 to 0.88; the first nodes show from ~0.55.
4. **Depth → Contact.** The Core comes into the frame from above early in the leg (toContact
   0.12 → 0.45, was 0.12 → 0.72) and rides with the camera at its resting place in the frame
   until the camera arrives, so it is in frame from ~5.2 to the loop. Its warm glow and the
   embers ride with it; Depth's bubbles and glass beads ride 65% of the way down with the camera
   and shrink away by toContact 0.75, so water and warmth share the frame from ~5.3 to ~5.65.
5. **Contact: The Core never covers "LET'S TALK".** Two hidden causes, both now off at Contact:
   the statement's exit term (it pulls The Core down after the camera) stayed active until The
   Core had fully arrived, so on screen it rose from below through the words; and the shared
   drag (Drift) pulled it ~1.6 units down while the camera descended. The words now leave with
   the scroll over the last fifth of a screen of their pinned stretch, so they are gone before
   the loop scrolls them up past The Core; before, a 0.7 s fade started only once they had begun
   to move. (They stay while something in them has keyboard focus.)
6. **Phones.** The trails follow the phone layout (System and Depth are centred there; the data
   trail used to run off the right edge), and the System → Depth trail is wider, denser and has
   larger motes (that leg is seen from 20–30 units). The statement's dust draws in sideways like
   The Core, and three more clouds of the same grains fill the band between the slab's edge and
   the tagline; three more System clouds hang below the graph. Desktop is unchanged.

EMPTY AREA (`scripts/empty-area.mjs`: compare-frames' rule, every frame of the four strips at 0.1
steps, settled 3 s, at the exact progress), frames over 60%:

| | 0.3–1.8 | 3.3–3.8 | 4.3–4.7 | 5.5–6.2 | all | worst |
|---|---|---|---|---|---|---|
| desktop full, before | 7 / 16 | 0 / 6 | 0 / 5 | 0 / 8 | 7 / 35 | 73% (1.5) |
| desktop full, after | 0 / 16 | 0 / 6 | 0 / 5 | 0 / 8 | **0 / 35** | 57% (1.5) |
| desktop lite, before | 6 / 16 | 0 / 6 | 0 / 5 | 0 / 8 | 6 / 35 | 69% (0.4) |
| desktop lite, after | 0 / 16 | 0 / 6 | 0 / 5 | 0 / 8 | **0 / 35** | 55% (1.6) |
| phone 390×844, before | 12 / 16 | 2 / 6 | 3 / 5 | 1 / 8 | 18 / 35 | 97% (0.4) |
| phone 390×844, after | 0 / 16 | 2 / 6 | 0 / 5 | 0 / 8 | **2 / 35** | 62% (3.8) |

Also checked, 5.0–5.5 (The Core's entry): 23–33% desktop, 17–58% phone.

The hand-overs (progress; "present" = ≥ 25% of its peak and in frame):

| Hand-over | Outgoing fades | Incoming present from | Overlap of the fade |
|---|---|---|---|
| gold cloud → dust sheet | 0.50 → 0.82 | 0.40 (its far edge) | 100% |
| tagline dust → wireframe | 1.14 → 1.53 | 1.15 (assembles ~1 s) | 97% |
| wireframe → trail + spine | 1.68 → ~1.75 | 1.38 (trail), ~1.3 (spine) | 100% |
| chips trail → System nodes | 3.88 → 4.00 | ~3.55 | 100% |
| data trail → Depth's water | 4.73 → 4.85 | ~4.6 | 100% |
| Depth bubbles → embers + glow | 5.45 → 5.75 | 5.30 | 100% |

"LET'S TALK" against The Core (`scripts/contact-overlap.mjs`: The Core's projected box against
the headline's glyph box grown by 16 px, whenever the words are more than 2% visible; at rest
from 5.0 to 7.0 in 0.02 steps, and in continuous scrolls down 5 → 7 and up 6.9 → 5 at 400, 1200
and 3000 px/s, every frame):

| Screen | Before (stage 6) | After: overlaps | After: smallest clearance |
|---|---|---|---|
| desktop 1440×900 | rising through the words at 5.8; the words crossing it in the loop | none | 45 px |
| 390×844 | its box on the "04 / CONTACT" label at 5.8 | none | 157 px |
| 375×667 | not measured | none | 72 px |
| 430×932 | not measured | none | 203 px |

Sheet: `docs/screens/loop1-transitions.jpg` (the reference's first scroll, seg_12 8–11.5 s; then
every strip after, desktop full, desktop lite and phone, each frame with its EMPTY AREA; then
desktop full and phone before).

Self-review against seg_12 and the rule:
- Closer: the first scroll reads like seg_12: a cloud of fine gold dust with faint wisps blooms
  round The Core, comes down with the camera and gives way to the slanted sheet as the camera
  passes through it; the frames between the hero and the statement are 18–29% empty (were
  45–68%).
- Closer: every scene change is a move through particles: the tagline's dust hangs round the
  wireframe as it forms, the wireframe stands while the camera holds, the dust streams down
  from it to the spine; Depth's bubbles and Contact's embers share the frame while The Core
  comes in from above and holds its place.
- Closer: The Core never covers "LET'S TALK", at rest or scrolling, on any of the four screens.
- Still different: seg_12's dust is brighter, yellower and denser round the object; ours is the
  warm token's orange-gold (the palette is locked), finer and wider.
- Still different: in seg_12 the object comes down with the camera and slides in front of the
  rising text; our Core waits at the hero until the camera is half-way (its travel to the
  statement is unchanged), so the cloud carries 0.3–0.6 alone. On phones, System's arrival
  (3.7–3.8) stays 61–62% empty after three passes: the graph fills the upper part, the text
  comes in below, and the dust there is fine and dim at the phone's 25-unit distance.

FPS (production, Retina, HD 630 lite, cursor moving, alternated with stage 6 and paused): at 0.4
(the held gold cloud), 1.4 (the standing wireframe, the tagline's dust) and 5.4 (The Core, its
glow, embers and the riding bubbles together): 59.8–60.4 after, 59.9–60.4 before.

## Stage 8 — production and polish checks (tag `loop1-stage-8`)
Files: `hooks/useFocusTrap.ts` (new), `components/work/WorkDetail.tsx` and
`components/depth/CapstoneDetail.tsx` (modal views), `canvas/usePointer.ts` (touch moves),
`motion/motion.ts` (the cursor family), `hero/Emblem.tsx`, `work/WorkCards.tsx`,
`depth/CapstonePanel.tsx` (tilts on the shared spring), `particles/simulation.ts` (the dust's
wake), `particles/CursorField.tsx` and `canvas/measure.ts` (a measurement hook), the brand images
(`app/opengraph-image.png`, `twitter-image.png`, `apple-icon.png`) and `scripts/brand-images.mjs`
(the icon's crop); tools `scripts/keyboard-pass.mjs`, `scripts/phone-pass.mjs`,
`scripts/og-check.mjs` (new).
1. **The toolbar pill is Vercel's toolbar, shown to you, not to visitors.** Nothing in the project
   injects a toolbar or overlay (no `@vercel/toolbar`, and Next's dev indicator only exists in
   `next dev`). On production Vercel shows its toolbar only to signed-in team members: through
   the browser extension, "Visit with Toolbar", or "Enable Vercel Toolbar in Production" in a
   preview's toolbar menu. Checked as a visitor: the production HTML carries no toolbar script
   (nothing from vercel.live), and the live page in a fresh browser makes no third-party request,
   has no toolbar element, and shows only our nav in its top-right corner. **To hide it for you
   as well** (Vercel's documented setting, a dashboard switch, so not something the code can
   set): Vercel dashboard → the project → Settings → General → Vercel Toolbar → Production: Off.
2. **Brand and OG images** regenerated from the new hero (`npm run brand:images`, against the
   production build): the OG and Twitter image show the Stage 1 Core with its iridescent rim; the
   Apple icon's crop follows the hero's larger Core (the whole frame with a margin; it was cut at
   the edges); the favicon (drawn from `icon.svg`) is unchanged. Previews (`scripts/og-check.mjs`):
   /, /cv, /work/bliggit and /work/capstone each carry their own title, description and URL, the
   image (PNG 1200×630, 200) with its alt text, and a large Twitter card. Sheet
   `docs/screens/loop1-og.jpg`.
3. **Keyboard and screen reader** (`scripts/keyboard-pass.mjs`, names from the accessibility
   tree): 65 Tab stops in reading order: skip link, name, nav (Work, Sound, Contact, CV), email,
   the filter (a labelled group of toggle buttons), the six cards (company, metric, role and
   years), the skills, the capstone, the contact links, Impressum, Datenschutz; every one with a
   visible focus ring on screen. The open views (a card's details, the capstone) are now modal
   dialogs: focus moves in, Tab and Shift+Tab stay inside (before: 10–13 of 16 Tabs left them),
   Esc closes and focus returns to the opener; `aria-modal` true, labelled by their title.
4. **One voice for the mouse.** Every cursor response in the scene now runs on the motion
   system's springs with one damping (ζ 0.8). The tilts of The Core, the cards and the capstone
   used their own exponential follower and took twice as long as the camera to settle, so they
   kept creeping after it stopped; they now share the camera's pointer spring. The grains spring
   home on the lighter member of the family, and the dust simulation's cursor wake fades on the
   same envelope.

   | Response to a step of the cursor | 63% at | overshoot | within 2% after |
   |---|---|---|---|
   | before: camera and grain parallax (0.45 Hz, ζ 0.85) | 0.68 s | 0.6% | 1.48 s |
   | before: card, capstone and Core tilt (exponential) | 0.77 s | 0% | 3.01 s |
   | before: grains spring home (0.8 Hz, ζ 0.7) | 0.35 s | 4.6% | 1.19 s |
   | after: camera, grain parallax and every tilt (0.45 Hz, ζ 0.8) | 0.66 s | 1.5% | 1.33 s |
   | after: grains spring home (0.8 Hz, ζ 0.8) | 0.37 s | 1.5% | 0.75 s |

   The dust's wake: e-folding time 0.33 s → 0.25 s (the grains' envelope).
5. **Phones** (`scripts/phone-pass.mjs`, 390×844, 375×667 and 430×932): the first swipe starts the
   3D and scrolls (from the top to y 300–420); no clipped text at any place, in the open views,
   on /cv or /impressum. Touch-drag was broken: after a few pixels the browser takes a touch over
   for scrolling (pointercancel) and sends no more pointer moves, so the stir died within ~0.1 s
   (0.05 → 0.00 by the end of a drag). The pointer now follows touch moves as well, and the stir
   holds through the drag (0.16–0.18 at its end, every size). Sheet `docs/screens/loop1-phones.jpg`
   (every place, the open card and capstone, and /cv, at each size).

FPS (production, Retina, the cursor moving at Work, where the new tilt springs act): 59.9–60.3 on
the HD 630 lite and on the discrete GPU.

## Final report — polish loop 1

### 1. Per stage
- **Stage 1, the hero** (`loop1-stage-1`): The Core's bevels carry an iridescent thin film with a
  travelling vivid spot; coloured light-formers in its environment; a crisper inner chamfer, a
  fine V-groove inside each face and engraved micro-lines; the light drifts cool → warm copper →
  cool every 9 s (full tier); the space round it is darker and alive (sparse dust, rising
  sparks, faint far glass arcs).
- **Stage 2, the column** (`loop1-stage-2`): a slimmer spine with leaf-shaped glass blades on
  most vertebrae, glassy rims, a band of light down the column every 7 s, calmer silhouette glints.
- **Stage 3, the glass particles** (`loop1-stage-3`): every grain is a faceted glass chip (film
  rim, fringe, glint in the place's light); one cursor field (full: a spring field the cursor's
  path writes into; lite and phones: a push); per-place light; new dust at the statement and System.
- **Stage 4, the gallery** (`loop1-stage-4`): a tighter regular helix; the focused card comes
  forward at its stop and dominates; neighbours at depth, softened on full; 3–4 cards in every
  Work frame (was 26% of frames).
- **Stage 5, the opened card** (`loop1-stage-5`): square to the screen, centred right of the
  details, never cut; its media sharp in the family grade (≤ 1.40× the closed card); the
  dissolve as image-coloured glass chips; phones fit.
- **Stage 6, the capstone** (`loop1-stage-6`): Depth's panel answers the cursor and opens like a
  card (fly-in, dissolve), with its own detail view, a two-image gallery behind a glass wipe, the
  route /work/capstone, focus handling and a phone swipe.
- **Stage 7, no thin frames, no overlaps** (`loop1-stage-7`): the gold cloud is held by the scroll
  and comes down with the camera; the tagline's dust lingers until the wireframe stands, and the
  wireframe holds while the camera holds; The Core comes into Contact from above and keeps its
  place in the frame, its glow and embers with it, Depth's bubbles overlapping; "LET'S TALK"
  leaves with the scroll; phones get the density they lacked.
- **Stage 8, production and polish** (`loop1-stage-8`): the toolbar pill identified (Vercel's,
  shown only to signed-in team members); brand and OG images from the new hero; modal views that
  trap focus; one spring family for everything the mouse moves; touch drag fixed on phones.
- **Gate** (this commit): a clean console (Fiber's Clock deprecation through three's console
  hook, the card faces' read-back hint), shaders compiled ahead for the variant actually drawn
  (no more first-sight stalls), lighter dust walls on lite, The Core's detail maps drawn after the
  first frame (desktop Lighthouse back above 90), the dust sheet skipped once out of view, a
  card's title scrim measured once per media, and on lite the live card scenes held still while
  the camera rushes past.

### 2. Metrics
**Work, column + air** (`compare-frames.mjs`, cards masked; JSON in
`docs/screens/metrics/loop1-column/`):

| Metric | Reference | Before the loop (v1-chrome) | Stage 3 | Final |
|---|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 34.6 (+22% ✗) | 32.4 (+14% ✓) | 30.3 (+7% ✓) |
| Contrast (luma std dev) | 21.2 | 28.4 (+34% ✗) | 28.5 (+35% ✗) | 25.9 (+22% ✗) |
| 5th / 95th percentile | 10.8 / 70.8 | 13.4 / 93.9 | 14.0 / 94.2 | 14.4 / 85.9 |
| Mean saturation | 0.427 | 0.427 (✓) | 0.428 (✓) | 0.447 (+5% ✓) |
| EMPTY AREA (% tiles) | 51.1 | 37.5 (-27% ✗) | 45.7 (-11% ✓) | 49.9 (-2% ✓) |
| SPARKLE (points / MP) | 341 | 775 (+127% ✗) | 1030 (+202% ✗) | 1340 (+293% ✗) |
| Hue distance (TV, ≤ 0.15 ✓) | 0 | 0.22 ✗ | 0.29 ✗ | 0.31 ✗ |

The final run measures more air than the reference (46% of the cropped frame against 31%): the
gallery's cards are smaller than theirs. Cards per Work frame: 3–4 in all 47 frames, the focused
card a median 53% of the frame's width.

**Opened card** (Stage 5): open media 1.27–1.40× the closed card's luminance, the same saturation.

**Transitions** (Stage 7): frames above 60% EMPTY AREA in the four strips, before → after:
desktop full 7 → 0 of 35, desktop lite 6 → 0, phone 18 → 2 (System's arrival, 3.7–3.8: 61–62%).
The Core over "LET'S TALK": none, at rest or scrolling at 400–3000 px/s, on all four screens
(clearance ≥ 45 px).

**The mouse's voice** (Stage 8): every tilt and the camera now settle together (1.33 s, 1.5%
overshoot); before, the tilts took 3.0 s.

### 3. Decisions I made
All in "## Decisions I made" above (Stages 1–8 and the gate), each with its reason.

### 4. Gate results
**Frame rate** (production, Retina, the final build; `scripts/fps.mjs`, `fps-place.mjs`):

| | Full tier (discrete GPU) | Lite tier (HD 630) |
|---|---|---|
| Every place (hero, statement, Work, System, Depth, Contact) | 59.9–60 | 60–60.2 |
| Down the Work cards (7 stops) | 59.9–60.3 | 59.9–60.3 |
| Idle hero, 60 s (5 s windows) | 60–60.1 | 60–60.2 |
| Fast scroll through two loops: slowest 1 s window | 59.8 (median 59.9) | 56.8 (median 59.8) |
| Work, the cursor moving constantly (20 s) | 59.9–60.4 | 59.9–60.3 |

Every window ≥ 55. Before the gate's fixes the lite fast scroll stalled 83–167 ms as each place
first came into view (shader links on first sight) and its slowest windows were 46–54; the
longest frame is now ≤ 50 ms. The HD 630 drifts with heat: the lite run above follows a
three-minute rest; in a long back-to-back session the same build's later card stops sagged to
51–54 (each segment run alone holds 60). On a real visit a device that stays under 55 is moved
down by the tier system (lower resolution, then lite).

**Lighthouse** (the local production build, Lighthouse 13.5, three runs each):

| | Performance | Accessibility | Best practices | SEO | Total blocking time |
|---|---|---|---|---|---|
| Desktop | 96, 94, 95 | 100 | 100 | 100 | 130–140 ms |
| Mobile | 95, 97, 93 | 100 | 100 | 100 | 160–220 ms |

Desktop was 84–86 before the gate's fixes (270–310 ms of blocking time; 91–93 before the loop).
An earlier mobile set on the same build scored 94, 94 and 87: in the 87 run the same task took
374 ms against 201 ms in the others (the machine's load at the time).

**Reduced motion**: a calm composition at every place (cuts between places), no errors, desktop
and phone. **No WebGL**: the static fallback (the static Core and every place's text), no canvas,
no errors, desktop and phone.

**Phone number only on /impressum** (`scripts/phone-only-impressum.mjs`): in the build output only
the Impressum route's own files and its server module carry it (no client bundle); on the live
pages only /impressum (15 routes checked); not in the CV PDF (its text read with PDFKit).

**Console** (`scripts/console-check.mjs`): down the whole journey, a card opened and closed with
the keyboard, /cv, /work/bliggit, /work/capstone, /impressum, /datenschutz and a 404: no errors, no
warnings, no failed requests, on desktop and phone, normally, with reduced motion and without
WebGL.

**Still open**: on phones, System's arrival (progress 3.7–3.8) is 61–62% empty (Stage 7's rule:
≤ 60%); every other strip frame passes on every setup.

### 5. What still differs from the reference
1. **Imagery in the glass** (needs art). Their cards and panels carry rich, colourful renders and
   video behind the frost; ours carry the real app screenshots and generated stand-ins, calmer
   and emptier at a glance (`loop1-vs-reference.jpg`, every Work pair). Media dropped into
   `public/work/<slug>/` appears without code changes.
2. **The column's sculpted detail** (needs art). Their column is a dense, scanned-looking form,
   speckled pink, teal and green all over; ours is a procedural dark-chrome spine with glass
   blades. The sculpted model has its slot (`public/models/spine.glb`).
3. **The air at Work** (code can fix). Their pockets mix several hues in one cloud and read
   denser, with larger chips; ours keep one hue per pocket and fine chips: SPARKLE is 4× theirs
   (1340 against 341 per megapixel) and the hues lean cyan (distance 0.31). The pocket hues and
   counts were locked this loop.
4. **The first scroll** (code can fix). Their object comes down with the camera and slides in
   front of the rising text inside a denser, yellower gold cloud; our Core waits at the hero until
   the camera is half-way (its travel to the statement is unchanged), so the cloud carries
   0.3–0.6 alone, in the warm token's orange-gold.
5. **Around the opened card** (code can fix). Their scene falls into smoke and the card breaks
   into a dense, opaque cloud of large chips; ours keeps the dimmed column and neighbours behind
   it, with a thinner dissolve.

### 6. Sheets
`docs/screens/`: `loop1-hero.jpg` (Stage 1), `loop1-column.jpg` (2), `loop1-particles.jpg`,
`loop1-pockets.jpg`, `loop1-cursor.jpg` (3), `loop1-composition.jpg` (4), `loop1-open-card.jpg`
(5), `loop1-capstone.jpg` (6), `loop1-transitions.jpg` (7), `loop1-phones.jpg`, `loop1-og.jpg`
(8), `loop1-journey.jpg` and `loop1-vs-reference.jpg` (the gate).

### For you
- **Vercel toolbar on production** (the pill in your recording): Vercel dashboard → this project
  → Settings → General → Vercel Toolbar → Production: **Off**. Visitors never get it; this hides
  it for you as well.
- **Content**: project media in `public/work/<slug>/` and the sculpted spine
  (`public/models/spine.glb`) lift the two "needs art" differences above.

# Polish loop 2 (2026-10-17)
Branch `polish-loop2` from `main` at `v2` (polish loop 1 merged, 9798b1f; the same commit is
tagged `before-loop2`). Nothing goes to `main`. Every stage ends with a commit, a tag
`loop2-stage-N` and a push of the branch.

## Plan
Tools: loop 1's scripts (capture-progress with the magnet off, capture-moments, record-work,
compare-frames, empty-area, fps, fps-place, fps-scroll, console-check, phone-only-impressum),
new ones where a stage needs them. Production build on port 3100, "before" builds on 3101.

**Stage 1 — pockets: soft round beads, mixed hues.** `shaders/glassGrain.glsl` (the bead:
round soft body, darker see-through middle, fresnel rim with thin film, one small glint, a
fringe ≤ 0.5 px on large beads only), `shaders/grainMotion.glsl` (brightness tiers ~70 / 25 /
5% and glints on the bright tier only, for every grain), the grain vertex shaders (glitter,
atmosphere, motes, bubble, card dust: tiers, wider blur range on full), `work/Pebbles.tsx`
(every pocket mixes 3–4 hues, one dominant at ~50%: teal-green, blue, violet, pink, a little
gold). Metrics: SPARKLE ≤ 2× the reference, hue distance ≤ 0.2. Sheet `loop2-pockets.jpg`.

**Stage 2 — cursor flow.** `particles/CursorField.tsx` and its field shaders (full: a 256²
flow texture the cursor writes its velocity into, advected with a slight curl and decaying,
plus a spring back home; lite and phones: the stateless push with a short velocity history),
`shaders/grainMotion.glsl` (how grains sample it, the glint of disturbed grains, the depth
parallax), per-place strengths, the card face and text blocks kept clear, touch drag at 60%
and a tap ripple on phones. Targets: a medium swipe moves near beads 30–60 px at 1440×900,
drift 0.3–0.6 s, settled in 1.5–2.5 s. Sheet `loop2-cursor.jpg` + `loop2-cursor.mp4`.

**Stage 3 — the first scroll.** `hero/Emblem.tsx` and `journey/GoldCloud.tsx` between progress
0 and 1 only: The Core comes down with the camera from the first scroll, turning edge-on, and
arrives as the statement's slit; the cloud denser round it, thinning as the statement arrives.
Rest states unchanged. Strip 0–1.1 at 0.05: `loop2-first-scroll.jpg` with seg_12.

**Stage 4 — the opened card's backdrop.** `work/WorkCards.tsx`, `depth/CapstonePanel.tsx`, a
backdrop layer (darken ~50–60%, a slow smoky fog in front of the scene; full: blur; lite: darken
+ fog), a denser bead dissolve. Sheet `loop2-open-card.jpg`.

**Stage 5 — click to close.** The open state's click handling (the card and the backdrop),
`ui/Cursor.tsx` and `stores/cursor.ts` ("CLOSE", the pair of "OPEN"), the open views' button
semantics and focus. Sheet `loop2-close.jpg`.

**Stage 6 — small fixes.** The capstone's medallion image graded like the dashboard; glass dust
at the phone's System arrival (≤ 60% empty).

**Gate**, then the report here and as the last message.

## LOCKED (unchanged this loop)
Everything not listed above: the hero, the column, the cards' tone, titles and faces, the
gallery layout, the capstone layout, transition timing outside Stage 3, UI copy, content, SEO,
legal pages, the CV, the tier system, performance work. The phone number only on /impressum.

## Stage 1 — soft round beads, mixed hues (tag `loop2-stage-1`)
Files: `shaders/glassGrain.glsl` (the bead), `shaders/grainMotion.glsl` (`grainTier`,
`grainGlints`), `shaders/glitter.vert/.frag`, `atmosphere.vert`, `motes.vert`, `bubble.vert`,
`cardDust.vert`, `work/Pebbles.tsx` (the pockets' mixes), `work/WorkCards.tsx` (the dissolve
takes `grainMotion.glsl` for the tiers); tools: new `scripts/pocket-sheet.mjs` (reference |
loop 1 | new, each at 1× and a 3× zoom), `scripts/compare-frames.mjs --ui`.

1. **Shape.** Every grain from ~3 px up is a round bead: a soft round silhouette (antialiased
   over about a pixel), a filled, slightly darker middle (0.6 of the rim: a drop, not a hollow
   bubble), a thin-film rim (teal → pink → gold by angle), one small glint up-left on the bright
   beads only, a chromatic fringe of at most 0.5 px on beads from 8–16 px up only; the full
   tier keeps the soft caustic on the far side. Tiny beads stay soft points.
2. **Colour.** Every Work pocket mixes 4 hues, one dominant at 45–50%: six mixes cycled round
   the 20 pockets (three violet-led, one blue-, one teal-, one purple-led), gold at 5% in four of
   them. The hues are evened to one luminance (gold and pink no longer outshine blue and
   violet); the violet leans 15% to pink and the pink 35% to violet (the reference's beads are
   blue-violet and purple, rarely magenta). The phones' three pockets take the first three
   mixes.
3. **Brightness.** Every grain in the world in three tiers (`grainTier`): 70% dim (0.42), 25%
   medium (1.0), 5% bright (2.0); only the bright tier glints and twinkles fully
   (`grainGlints`; a bead the cursor stirs still catches the light). Every layer keeps its mean
   (atmosphere, motes, rising grains, dissolve); the pockets' mean is ~30% lower.
4. **Blur.** Full tier: the circle of confusion 0.006 → 0.0095 and the largest bead 18 → 26 px
   (at 900 px tall), so out-of-focus beads grow larger and softer (a disc feathered from 0.55 of
   its radius) while in-focus ones stay crisp.
5. **Every place.** The same bead in the hero dust, the statement, System, Depth (plankton and
   beads), Contact's embers, the gold cloud and a card's dissolve; the per-place light is
   unchanged.

Passes: (1) round beads, tiers, mixes: the beads read as hollow soap bubbles at 3×, gold too
loud, the mid tones blue; (2) a filled body, the hues evened, the mixes leaning violet; (3) the
pink towards purple. Pass 3 kept.

Metrics (Work, our scripted scroll vs the reference's 100 frames; `docs/screens/metrics/loop2/`):

| | Reference | Loop 1 | Stage 1 |
|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 30.3 | 28.4 |
| Contrast | 21.2 | 25.9 | 21.6 |
| 95th percentile | 70.8 | 85.9 | 72.3 |
| Mean saturation | 0.427 | 0.447 | 0.471 |
| EMPTY AREA | 51.1% | 49.9% | 55.2% |
| SPARKLE, whole frame (points / MP) | 341 | 1340 | 1096 |
| SPARKLE, HTML UI left out (`--ui`) | 347 | 557 | 195 |
| Hue distance, whole frame | — | 0.31 | 0.33 |
| Hue distance, bright pixels (V ≥ 0.32: the beads) | — | 0.37 | 0.20 |

FPS (HD 630, Retina): lite 60 at the hero and at Work (2.0, 2.4); full at Work 51–56, the same
as loop 1 in alternating A/B runs (the larger out-of-focus beads cost nothing measurable).

Sheet: `docs/screens/loop2-pockets.jpg` (4 pockets: reference | loop 1 | new, at 1× and 3×).

Open point: a whole-frame hue distance ≤ 0.2 is out of the beads' reach (see Decisions).

## Stage 2 — cursor flow: dust in water (tag `loop2-stage-2`)
Files: `particles/CursorField.tsx` (the flow field, the lite trail, the clear areas, per-place
strength, taps), `shaders/cursorField.frag` (the flow), new `shaders/airPush.glsl` (how the
cursor drags the air, shared by both tiers), `shaders/grainMotion.glsl` (the lite trail, the
clear areas, the stirred glint), the grain shaders' call sites (`glitter.vert`,
`atmosphere.vert`, `motes.vert`, `bubble.vert`, `heroSpark.vert`), `motion/motion.ts`
(`MOTION.air`), `usePointer.ts` (taps, a finger landing), `work/WorkCards.tsx` (the card in focus
kept clear), `journey/GoldCloud.tsx`, `journey/DustSheet.tsx`, `hero/HeroAura.tsx`,
`journey/motes.ts` (`cursorMotes`); `data-keep-clear` on the places' text blocks (`Hero`,
`Approach`, `WorkSection`, `SystemSection`, `DepthSection`, `ContactSection`; no visual
change); tools: new `scripts/cursor-flow.mjs` (displacement in px per swipe, from the air
itself), `capture-swipe.mjs`, `swipe-sheet.mjs`, `record-swipe.mjs`, `swipe.mjs` (shared: exact
progress, a swipe played inside the page), `phone-pass.mjs` (reads the new probe).

1. **Flow, not push (full tier).** A 256² half-float ping-pong field (rg how far the air has
   moved, ba its velocity). Along its path the cursor drags the air towards a share of its own
   velocity (little of a slow move, more of a quick one), parting it a little, with a swirl
   either side. The air carries itself on (semi-Lagrangian advection) with a slight curl where
   it moves, and springs home on `MOTION.air`. Phones on the full tier write into the same
   field.
2. **Distance.** Swipes are defined as slow 300, medium 1000 and fast 2500 px/s at 1440×900.
   Measured at the hero (strength 1.0, `scripts/cursor-flow.mjs`, a grain at the focus; nearer
   ones move up to 1.8×, far ones 0.6×):

   | | slow | medium | fast | drift after the stop | settled (< 2 px) |
   |---|---|---|---|---|---|
   | Full | 17 px | 44 px | 89 px | 0.0 / 0.22 / 0.33 s | 1.0 / 1.9 / 2.7 s |
   | Lite | 11 px | 45 px | 85 px | 0.12 / 0.27 / 0.37 s | 1.0 / 1.4 / 1.6 s |
   | Phone, full (390×844, 60%) | 12 px | 24 px | 24 px | 0.07 / 0.22 / 0.32 s | 1.2 / 1.3 / 1.7 s |
   | Phone, lite | 5 px | 16 px | 25 px | 0.17 / 0.32 / 0.33 s | 0.8 / 1.3 / 1.4 s |

   A tap (phone): a ring ~10 px out, at its widest at 0.8 s, settled by ~2 s. A touch scroll:
   0 px on both tiers.
3. **Inertia and settle.** `MOTION.air` is now the cursor family's own spring (0.45 Hz, ζ 0.8,
   ~1.5% overshoot). The field takes the cursor's push softly (grip 7/s), so part of it lands
   just after the cursor has passed and the beads near the stop keep drifting 0.2–0.4 s.
4. **Everywhere, per place.** Every grain system samples the same air: Work's pockets and
   column dust, the hero's dust, its rising sparks (new) and the gold cloud (new), the slab
   (new), the statement, System, Depth (plankton, beads), Contact's embers and the atmosphere.
   Strength per place: hero 1, statement 0.5, Work 1, System 0.8, Depth 0.8, Contact 0.6.
5. **Light.** A stirred bead's glint flickers on its own phase while the air moves it
   (`grainStirred`), so a swipe leaves a short shimmer. Stirred soft dust (gold cloud, slab,
   sparks) brightens the same way.
6. **Depth parallax.** The field shifts against the cursor twice as far as before: with the
   cursor at an edge, grains at the subject's depth move 1.5% of the frame, nearer ones up to
   ~2.7% and far ones ~1%, on `MOTION.pointer`.
7. **Boundaries.** The air never pushes grains into the clear areas: the text blocks (their
   text's own extent, read from the page every 0.2 s while they show) and the card in focus
   (hovered, open or at the camera's stop, projected each frame). A grain outside one slides
   along its edge; one resting inside is left alone. No stirring while scrolling, over a
   hovered or open card, or over the text (now the real text, not the whole lower-left
   third). Reduced motion: no reaction and no parallax.
8. **Phones.** A drag that doesn't scroll stirs at 60%. Any change of the page's scroll stops
   it, so a scroll never stirs. A quick tap sends a small ripple. A finger landing elsewhere
   doesn't stir along the jump.
9. **Lite.** The cursor's recent path as 16 stretches (one per 0.1 s: where it went, its
   velocity, its age), each answered in the grain's own shader with the field's spring
   response. Each stretch's share is the falloff's integral along it, so stretches never
   count twice at their joints. A linger factor stands in for what the field does over time
   (it holds the air while a slow cursor lingers, takes only part of a quick pass), so both
   tiers move grains about as far.

FPS (production, Retina, the cursor moving constantly): full (discrete GPU) 59.9–60.4 at Work
(2.4) and the hero; lite on the HD 630 59.9–60.4 at both. Main-thread time is the same as loop 1
in alternating runs (90–104 vs 93–99 ms per 2 s).

Sheets:
- `docs/screens/loop2-cursor.jpg`: a Work pocket and the hero dust (full, lite, phone touch
  drag), each before, during, +0.3 / 0.8 / 1.5 / 2.5 s, and "moved" (+0.3 s in red over the
  frame before in cyan). The hero rows are shown at ×2.2 brightness: its dust is sparse by
  design.
- `docs/screens/loop2-cursor.mp4`: 7.7 s, a medium swipe through the hero's dust, then
  through a Work pocket, with the cursor ring.

Open points:
- The fast swipe on full settles in 2.7 s (target 1.5–2.5 s): it moves furthest, 89 px.
- The medium swipe's drift near the stop is 0.22 s on full (target 0.3–0.6 s); the field's
  largest displacement comes at +0.3 s for fast swipes.

## Stage 3 — the first scroll: travel with the camera (tag `loop2-stage-3`)
Files: `journey/path.ts` (`CORE` poses and `firstLeg`; the old `objects` clock removed),
`hero/Emblem.tsx` (The Core's path on the first leg), `journey/GoldCloud.tsx` (the cloud's
density, look and placement).

Before: The Core waited at the hero until the scroll passed 0.55, then flew to the statement
on its own 1.4 s clock. In between it left the frame upward (0.35–0.70: only the cloud), and
it came back up from below as the tagline rose.

1. **The Core rides with the camera.** Its path is read from the camera's own height (the
   rig's spring): 0 at the hero, 1 at the statement, so it stays in frame however fast the
   scroll. Its idle spin stops as the ride starts, and it turns steadily to the nearest edge
   angle over 30–90% of the leg (face-on in its cloud first, as in seg_12 at 12–13 s). It
   arrives as the slit in front of the tagline. On the way it trails the camera a little
   (≤ 0.3 units, on `MOTION.lag`) in place of the shared drag, which would pull it down into
   the rising tagline.
2. **The gold cloud wraps it.** The cloud now travels with The Core (its path, 0.7 of its
   approach in depth) and holds 8000 glass beads in gold tones (was 7000 soft dust points):
   - a shell wrapping The Core (30%), 12 clumps round it (45%) and a thin, wide band (25%);
   - beads of 2–6 px, in focus round The Core as it comes closer;
   - wisps a little stronger (0.25, was 0.2);
   - it thins out over 55–95% of the leg.
   It moves with the cursor (Stage 2).
3. **Rest states unchanged.** At 0 the hero is as before, and at 1 the statement's composition
   (position, size, the edge angle family) matches loop 1 on desktop and phone. Reduced motion
   cuts between the two, as before.

Passes:
- **Pass 1:** the camera-driven path. The Core stayed in frame, but its angle wandered (the
  idle spin kept running mid-leg) and the cloud's beads were too fine to read.
- **Pass 2:** beads 3.2× larger in shell, clumps and band. The cloud read as a dense, even
  "galaxy", and the edge angle was picked before the spin stopped.
- **Pass 3:** the angle is picked as the spin stops, the turn comes later in the leg, and the
  cloud is clumpier with gaps. Pass 3 kept.

FPS (production, Retina, the cursor moving) inside the cloud (0.3): full 59.9–60.4; lite on the
HD 630 59.9–60.3.

Sheet: `docs/screens/loop2-first-scroll.jpg`: the reference (seg_12, 11.5–15 s of the
recording), then 0–1.1 at 0.05 on desktop full, desktop lite and phone (390×844).

## Stage 4 — the opened card's backdrop (tag `loop2-stage-4`)
Files: new `work/openView.ts` (the card or capstone flown in: how far, how far from the
camera, its object), new `work/OpenBackdrop.tsx` and `shaders/openBackdrop.vert/.frag`,
`work/WorkCards.tsx` and `depth/CapstonePanel.tsx` (report the open view; a denser dissolve),
`Scene.tsx` (mounts the backdrop); tools: new `scripts/fps-open.mjs` (open / hold / close, four
cards, 1 s windows).

1. **The scene falls back into smoke.** While a card or the capstone is open, a backdrop stands
   just behind it, square to the camera. Full tier: a picture of the scene without the card,
   at a quarter of the resolution, every other frame, blurred, keeping 22% of its light, under
   a slow drift of streaky charcoal-teal smoke. The column and the other cards stay only as
   dim, soft shapes. Lite: the same darkening and a still fog, no picture. It follows the card's
   fly-in and fly-home, so closing restores the scene smoothly at the same scroll position (the
   capstone: 9900 → 9900).
2. **A denser dissolve.** 24k beads per card (was 14k), each ~17% larger, the Stage 1 bead look.
   Lite draws the first 14k.

Brightness behind the opened card (mean luma outside the card and the details column, six
cards, desktop full): loop 1 32.3 → 22.8 now. The grade's lifted blacks put the floor at ~14,
so what is visible above the floor went 18.3 → 8.8 (−52%). Lite: 19.7.

Passes:
- **Pass 1:** the backdrop as above. The background came out brighter (48.4): every point sprite
  keeps its full-screen size in pixels, so in the quarter-size picture the dust swelled into
  bright blobs.
- **Pass 2:** the picture leaves the dust out (behind the smoke it isn't missed; at_08 shows
  none). Still brighter (36.6): the smoke colour was mostly teal (see Decisions).
- **Pass 3:** a dark charcoal smoke with a trace of teal: 31.4, soft but not darker.
- **Pass 4:** 30% of the light kept and a streakier smoke (dark between brighter wisps): 24.6.
- **Pass 5:** 22% kept: 22.8 (−52% above the floor).
Passes 1–3 fixed defects; the tuning passes are 4 and 5.

FPS (production, Retina; scripts/fps-open.mjs):
- Full (discrete GPU): 55.9–60.9 in every 1 s window while opening, holding and closing four
  cards.
- Lite (HD 630, alternating runs; the machine moved between a cool and a throttled state):
  cool, the new build matched loop 1 (min 48.7 vs 48.8, the same windows) once lite's share of
  the backdrop was cut to loop 1's cost (a still fog for the smoke, loop 1's 14k beads). The
  windows under 55 while a card is open (≈49–55) are loop 1's own (the live card scene and
  the dissolve).

Sheet: `docs/screens/loop2-open-card.jpg`: at_08 | loop 1 | new, for three cards and the
capstone, on desktop and phone.

## Stage 5 — click to close, the cursor says "CLOSE" (tag `loop2-stage-5`)
Files: new `work/OpenCardButton.tsx` (the opened card as a button) and `work/OpenAnnouncer.tsx`
(a live region), `work/WorkDetail.tsx` and `depth/CapstoneDetail.tsx` (an outer dialog round
the animated details, so the card's button isn't clipped by their entry animation; the
details marked with the default cursor), `canvas/work/openView.ts` (the open card's screen
area; `CLOSE` guards), `canvas/work/OpenBackdrop.tsx` (a click on the smoke closes; "CLOSE"
over it; it no longer catches the pointer while hidden), `canvas/work/WorkCards.tsx` and
`canvas/depth/CapstonePanel.tsx` (report the area; reduced motion snaps open and shut),
`stores/work.ts` (`openedAt`), `stores/cursor.ts` and `ui/Cursor.tsx` + `globals.css` ("close"
mode: the same ring, label, spring and fade as "open"; the nearest of a link and a marked
area wins); tools: new `scripts/close-check.mjs`.

1. **Click to close.** A click or tap on the opened card (a real button lying over it,
   following it on screen) or on the smoke round it closes it, with the same transition as
   "Close". The scene stays at the same scroll position.
2. **Cursor.** Over the card and the smoke it reads "CLOSE": the same ring, label, spring and
   fade as "OPEN". Over the details it is its own (a link over links).
3. **What doesn't close.** Clicks on the details (text, links, previous / next, the capstone's
   gallery controls), the top bar or any control; a drag (> 6 px between press and release:
   a text selection, a swipe); and clicks during the fly-in (0.6 s).
4. **Accessibility.** The open card is a real button, "Close <project>", inside the dialog:
   Tab reaches it, Enter or Space close, Esc still closes, focus goes back to the card's own
   button, and a polite live region says "<project> opened / closed". Focused, it outlines the
   card.
5. **Phones.** A tap on the card (above the details) closes it, the details scroll without
   closing, a tap on the smoke closes it, and there is no cursor label on touch.
6. **Reduced motion.** The same behaviour; the card and the capstone now snap open and shut (no
   fly-in, no dissolve).

Checks (`scripts/close-check.mjs`, all six cards and the capstone): desktop 108/108,
phone 22/22, desktop with reduced motion 108/108. Opened from its own page (no tap first), the
dialog shows the site's focus ring once focus moves in, as loop 1's did: unchanged.

Sheet: `docs/screens/loop2-close.jpg`: on desktop, the opened card with the "CLOSE" cursor, the
cursor over the details in its own mode, and the closed state after the click (a card and the
capstone); on the phone, open, the tap, and closed.

## Stage 6 — small fixes (tag `loop2-stage-6`)
Files: `canvas/work/cardFace.ts` (diagrams graded down), `canvas/system/SystemDust.tsx` (the
phone's dust below the graph).

1. **The medallion flow no longer glares.** The capstone's second image (a diagram on a pale
   blue panel) is drawn through a tone curve (γ 1.7) as it goes onto the card. The panel and the
   mid-tones sink to the dashboard's darkness, and the medals, the title and the box text stay
   bright and readable. The surround was already the dark screen. The asset is unchanged.
2. **The phone's arrival at System is never more than 60% empty.** Below the graph, three
   clouds of glass dust now hold ~600 grains each (2400 in all, was 1050 shared with the graph's
   own clouds). On phones the graph is seen from ~1.8× further away, so its grains are drawn
   1.7× larger (as large as on desktop). EMPTY AREA at 3.65–4.0: 61–64% before, 53–59% now
   (the worst 59%, at 3.65 and 3.70).

Sheet: `docs/screens/loop2-small-fixes.jpg` (the capstone's two images, the medallion before
and after; the phone's System arrival before and after, with each frame's empty share).

## Decisions I made
- **The recording shows no cursor over the particles.** Across Work (26–51 s) the pointer
  hovers the cards (a hand over the card's edge), and in the hero's strip it crosses empty
  space; no frame has it over a pocket. Stage 2 follows the brief's own targets (flow, swirl,
  inertia, 30–60 px for a medium swipe).
- **SPARKLE is also measured without the HTML UI.** 75% of our sparkle points (334–421 of
  430–591 per frame) are the bright mono UI text (the filter row, the job list, the email),
  which is locked and not a particle; the reference's UI is dim and makes none.
  `compare-frames.mjs --ui` leaves the UI areas out on both sides, and both numbers are
  reported. On the scene alone loop 1 was 1.6× the reference and Stage 1 is 0.56×.
- **The whole-frame hue distance belongs to the air, not the beads.** By brightness band, the
  dark air (V 0.08–0.16, 67% of our coloured pixels) is 78% cyan in ours and 51% blue-violet
  in the reference (whose lower-left violet bleed fills large areas). That's Work's light,
  which this stage keeps, so the whole-frame distance stays at ~0.33 (loop 1 0.31). The beads
  are measured on the bright band instead: 0.37 → 0.20. The sheet shows the beads closer, so
  this stays; Work's air goes under "what still differs".
- **Beads filled, not hollow.** "A darker see-through middle" read as soap bubbles at 3× in
  pass 1. The reference's beads are filled drops with a brighter edge, so the middle sits at
  0.6 of the rim.
- **Pocket hues evened in luminance.** At the same colour strength, gold and pink are ~2×
  brighter than blue and violet. They are evened (by the square root of the luminance ratio),
  so a 5% gold share reads as 5%.
- **The pockets' mean is 30% lower; every other layer keeps its own.** With it, Work's mean
  luminance lands on the reference's 28.4 (loop 1 30.3), and contrast and the 95th percentile
  come close to it too.
- **EMPTY AREA 49.9 → 55.2% (reference 51.1).** The dim tier darkens a few sparse tiles; it is
  within the 15% band, and the sheet decides for the dimmer, softer beads.
- **The recording gives no cursor targets, so the brief's own numbers are the target.**
  Swipes are defined as slow 300, medium 1000 and fast 2500 px/s, and "near focus" as a grain
  at the subject's depth (×1).
- **`MOTION.air` is the pointer spring (0.45 Hz, ζ 0.8).** It is the family the brief points
  to: with it, the measured drift (0.2–0.4 s) and settle (1–2.7 s) are closest to the
  targets; 0.42 Hz / ζ 0.7 drifted no longer and settled later. The particle engine's wake
  (the Form beat's dust) fades on the same envelope, now a little longer.
- **The cursor's drag grows with its speed**, so a slow move nudges (17 px) and a fast one
  scatters (89 px) while a medium swipe sits at 44 px: a constant share gave a slow drag 41 px.
- **Lite measured on the same terms as full.** `cursor-flow.mjs` reads the air itself: the
  field is read back on full, and on lite the trail is evaluated in JS (the same function as
  the shader). The swipes run inside the page, since DevTools input arrives in bursts (a
  "1000 px/s" phone drag ran at ~300 px/s that way).
- **Clear areas from the page, not guessed zones.** The text blocks carry `data-keep-clear`, and
  the air reads their text's own extent (a Range's rectangle) every 0.2 s, skipping blocks
  that are faded out. This also replaces the "lower-left third" rule for where the cursor
  doesn't stir.
- **The gold cloud, the slab and the hero's sparks join the air** (the brief's "every particle
  system"). The gold cloud and slab keep their soft look (a `CURSOR` define, no glass grain)
  until Stage 3 reworks the gold cloud.
- **Seen while capturing: on phones the Work column appears only after a second touch.**
  After the first touch the cards and pockets mount but the column doesn't; it is the locked
  loading order (Deferred / Soon), so it is noted, not changed. The phone captures wake the
  scene with two passes first.
- **The Core's path follows the camera's height, not a clock.** The 1.4 s clock was there so
  the slit always lands in front of the tagline however fast the scroll. Reading the
  camera's own height keeps that (at rest it is exactly the statement pose) and keeps The
  Core in frame all the way, which the clock could not.
- **The spin stops as the ride starts.** A scroll that pauses half-way would otherwise show a
  half-spinning, half-held Core at a random angle. The turn to the edge comes later in the leg,
  because seg_12 keeps the object face-on in its cloud until the headline rises.
- **The gold cloud's dust became Stage 1 beads**, as the brief asks ("smoky wisps + Stage 1
  beads"), laid out after seg_12's cloud: clumps and a band round the object, not an even
  blob.
- **seg_12's transition is at 11.5–15 s of the recording** (the strip starts at ~12 s; the
  brief's "8–11.5 s" is the strip's own first tiles). The sheet uses frames from 11.5–15 s.
- **The backdrop is a plane behind the card showing a picture of the scene, not a post effect.**
  A post effect sees one image and can't tell the card and its dissolve from what is behind
  them. The picture is drawn without the card, so the card and its beads stay sharp in front.
- **The dust is left out of the backdrop's picture.** Point sprites are sized in screen pixels,
  so in a quarter-size picture each bead would cover 16× its share and the pockets would glow.
  Behind the smoke they are not missed; at_08 shows none.
- **"~55% darker" is measured above the grade's floor.** The lifted blacks never go below ~14,
  so halving the whole frame's mean is impossible. What shows above the floor went 18.3 → 8.8.
- **Lite's backdrop costs what loop 1 cost.** On the HD 630 the backdrop's smoke and the denser
  dissolve showed in the open-card windows. Lite now uses a still fog and loop 1's 14k beads, and
  matched loop 1 in a cool A/B. The full tier keeps the full look.
- **HD 630 numbers move with the machine's state.** This afternoon the editor and an open
  browser tab shared the GPU, and the same build ran 49–61 FPS in one run and 29–44 in the
  next. Only alternating A/B runs at the same moment are compared.
- **The opened card is an HTML button over the 3D card.** It is what the brief asks for
  accessibility ("a real button"), and it takes the clicks and taps on the card with the same
  guards. It follows the card's projected area each frame, and lives inside the dialog (which
  has no entry animation of its own now), so the focus trap includes it and the details'
  animation can't clip it.
- **Clicks on the smoke are the 3D scene's, filtered.** The scene listens on the whole page, so
  a click anywhere reaches the smoke. Clicks that land on the dialog, the top bar or any
  control are left alone, which covers the details, links, previous / next and the gallery
  controls.
- **The cursor: the nearest of a link and a marked area wins.** The details are marked with the
  default cursor, so they don't read "CLOSE" from the smoke behind them, but a link inside them
  still reads as a link.
- **The smoke no longer catches the pointer while hidden.** Three's raycaster ignores
  visibility, and the smoke stays where it last stood, in front of the camera. Without this,
  hovering and clicking the cards would have broken after the first close.
- **Reduced motion snaps the card open and shut.** Before, the fly-in and the dissolve played
  even with reduced motion. The brief asks for none.
- **The diagram is graded in code, not edited.** A tone curve keeps the brightest parts
  (medals, text) and sinks the panel; a flat darkening would have dimmed the text with it.
  The original SVG stays as it was (it is also the project's own artwork).
- **System's phone grains are scaled to the phone's camera distance.** The phone sees the graph
  from 30 units instead of 16.5, so the same grains read half as large. 2.4× the fine grain
  (desktop 1.4×) puts them back at their desktop size, and with the denser clouds below the
  graph that fills the band.

## Final report — polish loop 2
Branch `polish-loop2` (from `main` at `v2`, tagged `before-loop2`); never merged. Commit
"polish loop 2: beads, cursor flow, first scroll, open backdrop, click to close".

### 1. What changed, stage by stage
| Stage | What changed | Tag |
|---|---|---|
| 1. Pockets: soft round beads, mixed hues | Every grain in the world is a round glass bead (a filled body, a thin-film rim, one glint, a fringe ≤ 0.5 px on large beads only), in brightness tiers (70% dim, 25% medium, 5% bright; only the bright ones glint), with a wider depth of field on full; every Work pocket mixes four hues round one dominant (violet-led, blue, teal, purple, a little gold), evened in luminance | `loop2-stage-1` |
| 2. Cursor flow | Full: a 256² flow field the cursor writes its velocity into (advection, a slight curl, the cursor family's spring); lite: the cursor's recent path answered in the grains' shader. Every grain system answers, per place; stirred beads shimmer; parallax doubled; the card in focus and the text kept clear; phones stir at 60% on a drag, a tap ripples, a scroll never stirs | `loop2-stage-2` |
| 3. The first scroll | The Core rides down with the camera from the first scroll (its path read from the camera's height), its spin stopped, turning steadily edge-on as the tagline rises, arriving as the statement's slit; the gold cloud travels with it as 8000 Stage 1 beads in a shell, clumps and a band, with wisps, thinning at the statement. Rest states unchanged | `loop2-stage-3` |
| 4. The opened card's backdrop | Behind an opened card or the capstone the scene falls into smoke: a blurred picture of it without the card, keeping 22% of its light, under drifting charcoal smoke (lite: darkened, a still fog); a denser dissolve (24k beads; lite 14k) | `loop2-stage-4` |
| 5. Click to close | A click / tap on the opened card (a real "Close <project>" button over it) or on the smoke closes it (not during the fly-in, after a drag, or on the details and controls); the cursor reads CLOSE, the pair of OPEN; Enter / Space / Esc; focus returns; announced; reduced motion snaps | `loop2-stage-5` |
| 6. Small fixes | The medallion-flow diagram graded to the dashboard's darkness; glass dust below System's graph on phones (no frame above 60% empty) | `loop2-stage-6` |

### 2. Metrics
**Work, column + air** (our scripted scroll, 53 frames, against the reference's 100;
`docs/screens/metrics/loop2/final*.json`):

| | Reference | Loop 1 | Loop 2 |
|---|---|---|---|
| Mean luminance (0–255) | 28.4 | 30.3 | 28.6 |
| Contrast (luma std dev) | 21.2 | 25.9 | 21.8 |
| 95th percentile | 70.8 | 85.9 | 73.9 |
| Mean saturation | 0.427 | 0.447 | 0.466 |
| EMPTY AREA | 51.1% | 49.9% | 54.8% |
| SPARKLE, whole frame (points / MP) | 341 | 1340 | 1110 |
| SPARKLE, the HTML UI left out (`--ui`) | 347 | 557 | 202 |
| Hue distance, whole frame | — | 0.31 | 0.33 |
| Hue distance, bright pixels (V ≥ 0.32: the beads) | — | 0.37 | 0.20 |

Targets: SPARKLE ≤ 2× the reference is met either way (3.3× → with the UI text left out, which
was 75% of loop 1's points, 0.58×). Hue ≤ 0.2 is met for the beads (0.20). The whole frame stays
at 0.33: two thirds of its coloured pixels are Work's dark air, cyan in ours and blue-violet in
the reference, and Work's light was kept this loop.

**Cursor displacement** (a grain at the focus; 1440×900; phones 390×844 at 60% strength;
`scripts/cursor-flow.mjs`, the swipe played inside the page at an exact speed):

| | Slow 300 px/s | Medium 1000 px/s | Fast 2500 px/s | Drift after the stop | Settled (< 2 px) |
|---|---|---|---|---|---|
| Full | 17 px | 44 px | 89 px | 0.0 / 0.22 / 0.33 s | 1.0 / 1.9 / 2.7 s |
| Lite | 11 px | 45 px | 85 px | 0.12 / 0.27 / 0.37 s | 1.0 / 1.4 / 1.6 s |
| Phone, full | 12 px | 24 px | 24 px | 0.07 / 0.22 / 0.32 s | 1.2 / 1.3 / 1.7 s |
| Phone, lite | 5 px | 16 px | 25 px | 0.17 / 0.32 / 0.33 s | 0.8 / 1.3 / 1.4 s |

A tap on a phone: a ring ~10 px out, settled by ~2 s. A touch scroll: 0 px on both tiers.

**Elsewhere:**
- Behind an opened card: the mean luma outside the card and the details went 32.3 (loop 1) →
  22.8. Above the grade's floor (~14) that is −52%. Lite: 19.7.
- The phone's arrival at System: 61–64% empty → 53–59%.
- The first scroll: The Core in frame at every step of 0–1.1, on desktop full, lite and phone.

### 3. Decisions I made
All in "## Decisions I made" above, each with its reason. The ones that shape the results:
SPARKLE also measured without the HTML UI (75% of loop 1's points were the UI text); the
whole-frame hue distance is Work's air, not the beads (the beads measured on the bright band);
`MOTION.air` is the pointer spring; the swipe speeds defined as 300 / 1000 / 2500 px/s; The
Core's first-scroll path read from the camera's height instead of a clock; the backdrop as a
picture of the scene without the card (not a post effect), the dust left out of it; "~55%
darker" measured above the grade's floor; lite's backdrop cut to loop 1's cost; the opened
card as an HTML button over it; the diagram graded in code, not edited.

### 4. Gate results
**Frame rate** (production, Retina, the final build; `scripts/fps.mjs`, `fps-place.mjs`,
`fps-open.mjs`):

| | Full tier (discrete GPU) | Lite tier (HD 630) |
|---|---|---|
| Every place (hero, statement, Work, System, Depth, Contact) | 60–60.2 | 60–60.2 |
| Down the Work cards (7 stops) | 59.9–60.3 | 59.9–60.3 |
| Idle hero, 60 s (5 s windows) | 60–60.1 | 51.6–53.0 ✗ (loop 1 today: 52.0–53.6) |
| Fast scroll through two loops: slowest 1 s window | 59.8 (median 59.9) | 56.8 (median 59.8) |
| The cursor moving constantly over Work (20 s) | 59.9–60.3 | 59.9–60.4 |
| The cursor moving constantly over the hero (20 s) | 59.9–60.4 | 59.9–60.5 |
| Opening / holding / closing four cards (1 s windows) | 55.9–60.9 | 46.8–59.9 ✗ (loop 1, same A/B: 48.8–60.9) |

The full tier holds every window ≥ 55. On the HD 630 two items fail today, and loop 1's own build
fails them the same way, in alternating runs at the same moment:
- **The idle hero:** loop 2 51.6–53.0 against loop 1 52.0–53.6. In loop 1's gate this very build
  measured 60; the machine is slower today, with the editor and an open browser tab sharing the
  GPU.
- **A card held open:** windows dip to ~47–55 on both builds. The live card scene and the scene
  behind the smoke are still drawn (code can fix, below).
Loop 2's own lite costs were cut to loop 1's (the open-card smoke, the dissolve), and every lite
run with the cursor moving holds 60.

**Lighthouse** (the local production build, Lighthouse 13.5):

| | Performance | Accessibility | Best practices | SEO | Total blocking time |
|---|---|---|---|---|---|
| Desktop | 89, 94, 94; then 94, 94, 94 | 100 | 100 | 100 | 150 ms (240 in the cold first run) |
| Mobile | 92, 94, 94 | 100 | 100 | 100 | 190–240 ms |

The 89 was the first run of the first set (240 ms blocking). A second set, alternating with
loop 1, gave 94, 94, 94 against loop 1's 94, 94, 95 (140–160 ms).

**Reduced motion:** calm everywhere, no errors (desktop and phone). Click to close behaves the
same (108/108 checks), and the cards snap open and shut. **No WebGL:** the static fallback, no
canvas, no errors (desktop and phone).

**Phone number only on /impressum** (`scripts/phone-only-impressum.mjs`):
- **Build output:** only the Impressum route's own files and its server module carry it; no
  client bundle does.
- **Live pages:** only /impressum, across 15 routes.
- **CV PDF:** absent (the text is read, and the email is found).

**Console** (`scripts/console-check.mjs`): no errors, warnings or failed requests on desktop and
phone, normally, with reduced motion and without WebGL.

**Click to close** (`scripts/close-check.mjs`, six cards and the capstone): desktop 108/108,
phone 22/22, reduced motion 108/108.

### 5. What still differs from the reference
1. **Imagery in the glass** (needs art). Their cards and panels carry rich renders and video
   behind the frost. Ours carry the real screenshots and generated stand-ins, calmer at a glance
   (`loop2-vs-reference.jpg`, every Work pair). Media dropped into `public/work/<slug>/` appears
   without code changes.
2. **The column's sculpted detail** (needs art). Their column is a dense, scanned-looking form,
   speckled all over; ours is the procedural dark-chrome spine. The sculpted model has its slot
   (`public/models/spine.glb`).
3. **The air at Work** (code can fix). Their dark air is blue-violet, with a large violet bleed in
   the lower left; ours is a cyan-teal charcoal. Two thirds of the coloured pixels, so the
   whole-frame hue distance stays 0.33 while the beads match (0.20). It is Work's light and the
   grade, kept this loop.
4. **The pockets' density** (code can fix). Theirs are dense, overlapping clumps of larger beads;
   ours are looser clouds of the same beads (`loop2-pockets.jpg`, reference 3 and 4). The counts
   and placement were locked.
5. **The HD 630 with a card open, and the phone's column** (code can fix). With a card open, lite
   dips to ~47–55 as in loop 1: the scene behind the smoke and the live card scene are still
   drawn every frame, and on lite the backdrop could hold them still. On phones the Work column
   appears only after a second touch (the lazy load order), seen while capturing.

### 6. Sheets
- `docs/screens/loop2-pockets.jpg`: four pockets, reference | loop 1 | new, at 1× and 3×
  (Stage 1).
- `docs/screens/loop2-cursor.jpg` and `loop2-cursor.mp4`: a Work pocket and the hero dust, full
  / lite / phone touch drag, before / during / +0.3 / 0.8 / 1.5 / 2.5 s / moved; 7.7 s of swipes
  (Stage 2).
- `docs/screens/loop2-first-scroll.jpg`: seg_12 (11.5–15 s) above 0–1.1 at 0.05 on desktop full,
  lite and phone (Stage 3).
- `docs/screens/loop2-open-card.jpg`: at_08 | loop 1 | new for three cards and the capstone,
  desktop and phone (Stage 4).
- `docs/screens/loop2-close.jpg`: the CLOSE cursor, the cursor over the details, closed after
  the click (a card and the capstone), and the phone tap sequence (Stage 5).
- `docs/screens/loop2-small-fixes.jpg`: the medallion before / after; the phone's System
  arrival before / after (Stage 6).
- `docs/screens/loop2-vs-reference.jpg`: the hero, the first scroll, eight matched Work frames
  and the opened card against the reference (gate).
- `docs/screens/loop2-journey.jpg`: 0–7 at 0.5 on desktop full, desktop lite and phone 390×844
  (gate).
- Metrics: `docs/screens/metrics/loop2/` (stage 1, final, with and without the UI).

# Look round (2026-10-18)
Branch `look-round` from `main` at `v3` (polish loop 2 merged; the same commit is tagged
`before-look`). Nothing goes to `main`. Every stage ends with a commit, a tag `look-stage-N` and
a push of the branch.

## Inputs
- **`public/models/spine-raw.glb`: found.** A trimesh export: 8,320 triangles, 6,653 vertices
  (position + uv, no normals), one 1024² colour texture, no normal map. It is 1.0 tall × 0.27 ×
  0.39 (Y up): a short spine of eight vertebrae, with processes curving out to the sides.
  Stage 1 follows route A, "a short piece": copies along the column path.
- **`public/work/bliggit/demo.mp4`: not found.** Bliggit's loop is the fallback, made from the
  two screenshots (cover.png, login.png).
- **Dashboard URL:** https://aiwork-eu.streamlit.app/ (the capstone repo's README). It answers
  slowly with a redirect (a sleeping Streamlit app). It is recorded with a headless browser if
  it wakes; otherwise the fallback: a slow pan / zoom across dashboard.png with a light sweep.

## Plan
**Stage 1: the sculpted column.**
- New `scripts/build-spine.mjs` (gltf-transform + three in Node), steps in order:
  1. Weld, drop stray islands, centre, keep Y up.
  2. Compute the oil material's `crevice` (a cavity measure) and `thin` (distance out along a
     process).
  3. Lay copies down the column's existing path (its S-curve, twist and width swell), each with
     its own turn, scale 0.8–1.2, a slight non-uniform scale and some mirrored, with
     overlapping joints.
  4. Crease-angle normals; a decimated lite LOD; meshopt compression.
- Outputs: `public/models/spine.glb` and `spine-lite.glb`.
- `work/spineModel.ts` and `Spine.tsx`: the LOD per tier (phones lite), the attributes, the
  column's own extent (the ends dissolve as now); the procedural column stays as the fallback.
- The `assets.json` route lists the files. The material stays the oil material; a detail
  normal map only if the close camera shows the model too smooth.
- Budgets: full ≤ 150k triangles, lite ≤ 60k, ≤ 3 MB. Sheet `look-column.jpg`.

**Stage 2: moving imagery in the cards.**
- New `scripts/` steps to make the loops:
  - Bliggit: a pan through the home screen in the front phone, the login still in the second
    phone, a light sweep.
  - The capstone: a recording of the dashboard, graded, or the fallback.
  - The five confidential jobs: offline renders of each card's own live scene, filmic, no text
    or logos.
- Each loop to spec: 6–10 s, 1280×800 plus a 640×400 variant, MP4 + WebM, poster.jpg, ≤ 2.5 MB.
- In the cards: `work/cardFace.ts`, `WorkCards.tsx` and `depth/CapstonePanel.tsx` take video
  textures under the frost, play only in view, use posters until ready, and stop the live
  scenes' per-frame renders.
- The `assets.json` route lists the loops (the capstone's gallery leaves the poster out).
- Sheet `look-card-media.jpg`.

**Stage 3: true glass beads.** `shaders/glassGrain.glsl` and the grain fragment shaders:
refraction of the scene behind medium and large beads on full; a dark core, a bright thin edge
and a sharp sparkle, film-tinted; bokeh discs with a faint edge out of focus; lite without
refraction. Sheet `look-glass-beads.jpg`.

**Stage 4: clinging clouds.** `work/Pebbles.tsx` (placement, counts):
- 60% of Work's beads hug the column's surface (sampled from the Stage 1 model).
- Smaller clouds gather along the cards' edges near the column (never on a focused face or a
  title).
- Cores 1.5–2× denser.
Sheet `look-pockets.jpg`.

**Stage 5: a visible mouse effect.** A sparse glass bead layer round The Core in the hero, the
shimmer a little stronger. Video `look-cursor.mp4`.

**Stage 6: blue-violet air at Work.** `Backdrop.tsx`: Work's haze, fog and backlight toward
deep blue-violet, at the same darkness. Sheet `look-air.jpg`.

**Gate**, then the final report here and as the last message.

## LOCKED (unchanged this round)
The hero, the statement, the transitions and their timing, the first scroll, the cards' layout,
sizes and positions, the card titles (Departure Mono, two lines), the cards' frost structure
and bevel, the gallery composition, the opened-card layout and backdrop, click to close,
System, Depth's layout, Contact, UI copy and content, SEO, legal pages, the CV, the tier system.
The phone number only on /impressum.

## Stage 1 — the sculpted column (tag `look-stage-1`)
Files: new `scripts/build-spine.mjs` and `canvas/afterHero.ts`; `canvas/work/spineModel.ts`
(rewritten), `canvas/work/Spine.tsx`, `canvas/work/oilMaterial.ts`, `canvas/shaders/oil.glsl`,
`app/assets.json/route.ts`; `public/models/spine.glb`, `spine-lite.glb` (built),
`public/models/README.md`, a note at the top of `docs/SPINE_MODEL_SPEC.md`.

**The raw piece (inspection).** `spine-raw.glb`: one mesh, 8,320 triangles, 6,653 vertices
(4,160 once welded: the export splits them along its UV seams), positions and UVs only, one
1024² colour texture (not used: the site's own material replaces it). Watertight: 0 open edges,
0 non-manifold edges, one island, genus 1 (the canal runs through it). 0.27 × 1.0 × 0.39, Y up,
already centred. One piece of eight vertebrae (a short stretch, not a whole column): route A,
copies along the column's path.

**The build** (`node scripts/build-spine.mjs`, repeatable):
1. Weld; report holes and non-manifold edges; drop islands under 2% (none here); centre.
2. The oil material's attributes, computed on the piece. `crevice` comes from a cavity measure:
   how far the ring of neighbours sits out along the normal, smoothed. It catches the hollows
   and the groove down the middle. `thin` is the distance from the axis between the body's
   radius and the processes' reach, so the horns read glassy.
3. One step of Loop subdivision (8,320 → 33,280 triangles per piece), so the silhouettes are
   round at the close camera. The lite file is then simplified (meshoptimizer, vertices moved
   to keep the shape).
4. The column is four copies, from y 10.3 down past −12.5. Each copy is 0.8–1.2 of the base
   height (6.5), its height easing from one copy to the next, and some are mirrored. The turn
   round the axis, the width (0.88–1.12) and a slight squash (±8%) flow from one copy's value
   to the next, so the two copies at a joint agree. Each copy overlaps the next by exactly one
   vertebra: the joints fuse with no seam. Then everything bends along the procedural column's
   own path (`deform()`: swell, twist, S-curve). The ends dissolve into grains as before: the
   material is unchanged there.
5. Normals with a 70° crease, per corner: smooth across the sculpt, crisp only where it truly
   folds. (A first try grouped faces greedily and turned the whole surface into facets.)
6. Quantized and meshopt-compressed.

**Budgets.**
| | triangles | vertices | file |
|---|---|---|---|
| full (`spine.glb`) | 133,120 | 69,039 | 724 KB |
| lite + phones (`spine-lite.glb`) | 58,000 | 32,618 | 358 KB |

Both are within the brief (≤ 150k / ≤ 60k, ≤ 3 MB). There are no textures, so there is no
KTX2.

**Loading.** The files load only once the visitor has left the hero: `afterHero()` waits for
progress 0.3, or resolves at once on a page that starts further down, such as /work/<slug>.
They go through the same loader as before (GLTFLoader + meshopt; Draco and KTX2 are dropped,
the build never uses them). The procedural column is still built in its worker at start-up. It
shows until the model arrives and stays if the model cannot load. The full tier loads
`spine.glb`; the lite tier and phones load `spine-lite.glb`. A drop to lite swaps in the lite
file. Phones keep the loop 1 column width (×0.85).

**Material: the carving.** The model takes the oil material's `SCULPTED` path:
- **Carved micro-ridges** (the brief's detail normal map, made procedurally: no UVs, no
  texture). There are two scales of ridged simplex noise in object space; lite keeps the
  larger only. The bump comes from the noise's analytic gradient. An earlier version took the
  slope across the screen (`dFdx`), and that showed 2×2-pixel blocks.
- **The film mottled by the carving**, so colour changes along the ridges.
- **Rougher, darker troughs.**
- **The film colours all but the hottest highlights** (white from luminance 1.4–3.0 instead of
  0.9–2.2).

Everything else is the loop 2c / loop 1 chrome language, unchanged: the near-black body, the
teal → pink → gold film, glassy thin parts (full: the tinted see-through body; lite: the rim
tint), the 7 s light band and the sparse glitter. The procedural stand-in keeps its own
facets and grooves.

**Tuning passes** (sheet crops at Work 2.35 and 2.95):
1. Ridges at ×7 / ×19, 0.02 deep: glitter like sandpaper, white sparkles everywhere.
2. ×5 / ×12, 0.006 deep: carved, but grey-white chrome; the vertebrae are half the
   reference's size on screen.
3. The piece at 6.5 tall (was 5.2) and more film. A faint sheen on the ridges was tried in
   this pass. It washed the near-black body lilac-grey, so it was removed. Then the bump was
   moved to the analytic gradient (a fix for the blocks, not a look change).

**Sheet:** `docs/screens/look-column.jpg`. The rows: reference column crops (at_04–at_07),
then current (v3) full, new full, new lite, current phone and new phone, each at the same 4
orbit angles (Work 2.05 / 2.35 / 2.65 / 2.95), framed on the column.
- **Closer:** the column now reads as a spine. Stacked vertebrae with horn-like processes and
  dark gaps between them, like at_04's top and at_06. v3's column read as smooth lobes with a
  few blades.
- **Closer:** scale. The vertebrae are about 0.8 units tall, close to the reference's on-screen
  size next to a card (v3's lobes were one per card height).
- **Closer:** surface. The carving breaks the highlights into small sharp glints over a
  near-black body, instead of one smooth chrome reflection.
- **Still different:** colour. The reference's surface is a saturated oil-slick mottle (magenta,
  violet and teal patches on black). Ours stays a darker chrome whose colour lives on the ridges
  and highlight edges. Open point; it needs art (a baked iridescence texture on the piece) or a
  further round.
- **Still different:** the reference's vertebral bodies are wide drums with ridged rims. Ours
  follow the supplied sculpt (narrower bodies, longer curved horns). That needs art (the model).

**FPS** (production, Retina, A/B against v3 with rests):
| 2 s windows, min of two runs | Work 2.35 | Work 2.95 |
|---|---|---|
| full · new | 59.9 | 59.9 |
| full · v3 | 59.9 | 59.9 |
| lite (HD 630) · new | 59.9 | 59.9 |
| lite (HD 630) · v3 | 59.9 | 59.9 |

Every window was 59.9–60.4 on both builds and both tiers. Loading: at the hero (8 s, desktop and
phone) no model is requested; after the first scroll, desktop fetches `spine.glb` and the phone
`spine-lite.glb`. The arrival (Work 1.75) and the way out (3.25) show the dissolving tip and no
cut ends.

## Stage 2 — moving imagery in the cards (tag `look-stage-2`)
Files:
- New scripts: `scripts/record-dashboard.mjs`, `scripts/make-loops.mjs`, `scripts/loops/encode.mjs`,
  `scripts/loops/stage.ts`, `scripts/loops/phones.ts`.
- New canvas code: `canvas/work/cardMedia.ts` (the loop as a texture, and one frame of a card's
  media) and `canvas/shaders/srgb.glsl`.
- Changed: `canvas/work/WorkCards.tsx`, `canvas/work/cardFace.ts` (the static two-phone drawing
  moved to the loop stage), `canvas/work/cardScenes/` (`view()`, a `detail` multiplier),
  `canvas/depth/CapstonePanel.tsx`, `components/depth/CapstoneDetail.tsx`,
  `canvas/shaders/frost.frag`, `cardDust.vert`, `app/assets.json/route.ts`,
  `canvas/assets.ts`, `content/site.ts` (the loop's description in the capstone gallery),
  `scripts/capture-stops.mjs` (`HOVER=1`), `scripts/card-tone.mjs`.
- Media: `public/work/<slug>/loop.mp4`, `loop.webm`, `loop-640.mp4`, `loop-640.webm`,
  `poster.jpg` for all six jobs and the capstone. esbuild 0.28.2 is a dev dependency.

**The loops** (every one is 10 s at 30 fps, seamless, 1280×800 H.264 + VP9 with no audio,
plus a 640×400 pair and a poster):
- **Capstone: real media.** The live dashboard (https://aiwork-eu.streamlit.app/, woken from
  sleep) was recorded with a headless browser on the Jobs tab's AI-exposure bubble chart:
  - a slow scroll, the cursor gliding over the bubbles so their tooltips show (an arrow is
    drawn: headless screenshots carry no pointer), and one change of the year (2026 → 2025);
  - frames taken step by step, so the motion is even; the year change waits for the redraw;
  - graded a little darker and cooler for Depth.

  The recording, not the fallback.
- **Bliggit: real media, fallback route** (no `demo.mp4`). The two real screenshots sit in the
  card's own two-phone composition (unchanged positions). The home screen pans slowly in the
  front phone (zoom 1.06: enough to move, not enough to cut its edges), the phones drift in
  counterpoint, and a soft light crosses once. No invented UI.
- **The confidential jobs and Freelance: illustrative.** Each card's own live scene is rendered
  offline with a production esbuild bundle of the same scene code:
  - twice the particles (campaign bars keep the card's own count: their stream is the subject,
    and doubling it cost the file its quality);
  - a slow camera drift that repeats every loop;
  - depth of field holding the whole subject sharp;
  - bloom on the highlights, a light sweep once per loop, a vignette, fine grain from the
    encoder;
  - scene time at half speed: calmer, and the seam's one-second crossfade joins two close
    views.

  Abstract only, as the live cards were: no logos, screens or text.

| Loop | mp4 | webm | 640 mp4 | 640 webm | poster |
|---|---|---|---|---|---|
| bliggit | 976 KB | 848 KB | 361 KB | 274 KB | 94 KB |
| kuehne-nagel | 713 KB | 437 KB | 205 KB | 135 KB | 50 KB |
| adesso | 1234 KB | 848 KB | 434 KB | 312 KB | 70 KB |
| eon | 1365 KB | 1085 KB | 399 KB | 344 KB | 69 KB |
| licht-und-schatten | 2206 KB | 2372 KB | 758 KB | 779 KB | 99 KB |
| freelance | 1714 KB | 1634 KB | 636 KB | 647 KB | 78 KB |
| capstone | 515 KB | 445 KB | 241 KB | 224 KB | 91 KB |

Every 1280 file is ≤ 2.5 MB (decimal) and every 640 file ≤ 0.8 MB, a budget I added for phones.
Licht & Schatten is the heaviest: its stream of moving points compresses worst, even at the
card's own particle count. A desktop visitor who sees every card downloads ~7.7 MB of WebM; a
phone ~2.7 MB; the posters are 0.55 MB; 22.7 MB sit on disk across all variants. Nothing loads
at the hero: at Work, the posters, then only the loops of the cards in view (desktop: 4 WebM at
the first stop; phone: 2 small WebM).

**Playback** (`cardMedia.ts`):
- A card's loop downloads the first time the card is in view; its poster, drawn on the face,
  shows until then and until the first frame. It plays while the card is seen and pauses
  otherwise.
- New frames reach the texture on the card's own cadence: every frame when focused or open,
  every other frame at rest (lite: every third), only if the video drew one since. A
  `VideoTexture` subclass marks frames pending instead of uploading each one.
- The lite tier and phones take the 640×400 file. Reduced motion never loads a loop: the
  posters stay.
- The live scenes no longer render where a loop replaces them. Their code stays: the offline
  renders use it, and a job without a loop still gets its live scene.
- The capstone panel plays its loop at rest (frosted) and as the first item of the open
  gallery (sharp), with the dashboard screenshot (in its cover crop) and the medallion after
  it. The HTML gallery's thumbnail for the loop is its poster, described for screen readers.
- Found: three uploads video frames as stored (sRGB) and decodes them only in its own materials.
  The card shaders now decode them (`srgb.glsl`, `uDecode`). Without it every loop showed
  about twice too bright in the mid-tones.

**Tone** (`scripts/card-tone.mjs`: inside each card's outline, closed at its stop vs opened):
| Card | closed v3 → new | open / closed v3 → new |
|---|---|---|
| bliggit | 56.5 → 51.9 | 1.40× → 1.34× |
| kuehne-nagel | 46.5 → 45.1 | 1.35× → 1.26× |
| adesso | 36.7 → 36.4 | 1.36× → 1.23× |
| eon | 51.6 → 49.1 | 1.39× → 1.38× |
| licht-und-schatten | 40.1 → 45.1 | 1.37× → 1.37× |
| freelance | 46.1 → 44.2 | 1.25× → 1.39× |

Closed, the cards sit where v3's did (frosted and dim, the same family grade). Opened, every
card is within the loop 1 rule (≤ 1.4×). Getting there took three passes:
1. Without the sRGB decode the loops read 1.3–1.8× brighter closed and up to 1.57× opened.
2. With it, Freelance (1.50×), E.ON (1.43×) and Licht & Schatten (1.41×) were still over.
3. A softer light sweep and bloom, and Freelance's dust at 1.5× instead of 2×, brought them
   under. The first renders' depth of field also softened the opened globe; the in-focus range
   was widened so whole subjects stay sharp.

**Sheet:** `docs/screens/look-card-media.jpg`.
- Desktop: a row of reference cards (at_05, at_06, at_07, seg_44), then per card closed before
  / closed new / hover new / opened before / opened new, for all six jobs and the capstone.
- Phone: closed and opened, before and new.

What it shows:
- **Closer:** every card now carries moving imagery, as the reference's do.
  - The capstone shows the real dashboard in motion: tooltips, a year change.
  - Bliggit's real screens move in their phones.
  - The illustrative scenes have drift, depth of field and a passing light. Under the frost the
    stills are near-identical to v3; the gain is the motion.
- **Closer:** opened, the media now has the depth and light of a render (the device grid's far
  rows fall soft, the light crosses the shield) instead of a flat live scene.
- **Same:** closed tone and saturation stay in the family grade (no card glares in the gallery).
- **Still different:** the reference's cards hold rich, colourful, near-photographic renders
  (flowers, landscapes, characters). Ours stay abstract for every confidential job, by rule,
  and the real media are a phone app and a dashboard. Needs art: client-approved footage or
  commissioned renders.

**FPS** (production, Retina, 2 s windows, min of two runs, A/B against v3 with rests; the loops
playing):
| | Work 2.35 | Work 2.95 | Depth 5.0 |
|---|---|---|---|
| full · new | 59.8 | 59.9 | 59.8 |
| full · v3 | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · new | 59.9 | 59.8 | 59.9 |
| lite (HD 630) · v3 | 59.9 | 59.9 | 59.9 |

These were measured with the final playback code, before the last loop renders and the sRGB
decode (one more `pow` per pixel on a playing card). No console errors or warnings on desktop,
phone or reduced motion.

## Stage 3 — true glass beads (tag `look-stage-3`)
Files:
- `shaders/glassGrain.glsl` (the bead, rewritten).
- Its callers: `grain.frag`, `atmosphere.frag`, `glitter.frag`, `risingGrain.frag`,
  `cardDust.frag`.
- `particles/CursorField.tsx`: the shared uniforms, `grainBlending`, the place's light in view
  space.
- New `particles/grainScene.ts`: the picture the beads refract; `work/WorkPlace.tsx` takes it.
- Ten bead materials switched to the shared blending: `work/Pebbles.tsx` (×2),
  `system/SystemDust.tsx`, `journey/Atmosphere.tsx`, `ContactEmbers.tsx`, `GoldCloud.tsx`,
  `ParticleWall.tsx`, `DustTrail.tsx`, `depth/DepthBubbles.tsx`, `DepthWorld.tsx`.
- The card dust's uniforms (`work/WorkCards.tsx`); `scripts/pocket-sheet.mjs` (`ZOOM`).

1. **Refraction** (full tier, at Work):
   - Each frame a low-resolution picture of the frame without its particles is taken (0.35×,
     the column, the cards and the air: `grainScene.ts`).
   - Beads from ~5 px up bend it like small ball lenses: inverted and slightly magnified in the
     middle, the surroundings drawn in at the rim. Red and blue bend a few hundredths apart
     (well under half a pixel) on the large beads. Small beads keep a tint and an edge.
   - All bead materials now draw premultiplied. A bead adds its light as before (alpha 0) or,
     refracting, takes 55% of the place of what is behind it.
   - Lite, phones and the other places don't take the picture: their beads keep the soft light
     on their far side instead.
2. **Glass shading:**
   - a filled body, a little darker in the middle (0.5 of its colour, 0.8 at the rim);
   - a thin bright edge tinted by thin film (teal → pink → gold by angle);
   - the half-pixel chromatic split on the large beads only;
   - one sharp sparkle on the side the place's light comes from (from its direction in view
     space, `uGrainLightView`).
3. **Light:**
   - Every bead's sparkle is faintly on (0.28) and flares as the bead turns through the light
     (the existing per-bead facet against the place's light, and the column's sweep band).
   - The cursor's stir (loop 2's shimmer) also flares it (to 1.98).
4. **Depth:** out-of-focus beads are bokeh discs: a soft fill with the faint bright edge of
   out-of-focus glass (`grainBokeh`). In-focus beads are unchanged: crisp.
5. **Lite and phones:** core, edge, sparkle and tint, no refraction.

Sizes, hues, the 70 / 25 / 5 brightness split and placement are unchanged.

**Passes** (sheet crops at 4×):
1. Dark core (0.34), a bright ring (0.42), refraction taking 92%. The beads read as hollow
   soap bubbles: over Work's dark air the lens has nothing bright to bend, so the core emptied.
2. A filled core (0.5–0.8), a thinner edge (0.24), refraction at 55%. Filled glass drops, the
   reference's look.

**Sheet:** `docs/screens/look-glass-beads.jpg`. Reference pocket crops | loop 2 | new, each at 1×
and 4×. Rows 1–4 are the loop 2 pockets (at_05, at_06, at_07, at_09); row 5 is the cloud
against the column, row 6 beads at a card's edge and the column's process.
- **Closer:** the beads read as pieces of glass: a defined edge with a coloured film, a filled
  body and, on the bright ones, a sharp sparkle. Loop 2's were soft dots.
- **Closer:** out of focus, the bokeh discs carry the faint bright rim the reference's soft
  beads show.
- **Still different:** refraction is hard to see in this composition. Clouds hang beside the
  column and the cards, and the keep-clear rule holds them off the faces, so little that is
  bright sits behind a bead. Stage 4's clinging clouds put beads on the column and the cards'
  edges; the effect shows there.
- **Still different:** the reference's beads vary in shape (chunky, slightly irregular pebbles,
  some faceted); ours are perfect circles. Code can fix: a per-bead outline wobble, or a little
  faceting at the rim.

**FPS** (production, Retina, 2 s windows, min of two runs, A/B against v3 with rests):
| | Work 2.0 | Work 2.35 | Work 2.95 |
|---|---|---|---|
| full · new (with the picture) | 59.9 | 59.8 | 59.9 |
| full · v3 | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · new | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · v3 | 59.9 | 59.8 | 59.8 |

The extra low-resolution scene render costs nothing measurable on the full tier. Lite doesn't
take it. Console clean.

## Stage 4 — particles on the cards and the column, denser clouds (tag `look-stage-4`)
Files: `scripts/build-spine.mjs` (the bead anchors), `public/models/spine*.glb`,
`work/spineModel.ts`, `work/Spine.tsx`, `work/Pebbles.tsx` (`ColumnBeads`, the free pockets,
`EDGE_PALETTE`), `shaders/glitter.vert` (`SURFACE`; the fade in clear areas),
`shaders/grainMotion.glsl` (`grainClear`), `work/WorkCards.tsx` (the cards' edge clouds),
`work/WorkPlace.tsx`, `styles/scene.ts` (`pebbles.count`), `lab/WorkLab.tsx`.

1. **The column's clouds:**
   - `build-spine.mjs` samples 16,000 anchors on the full column's surface, in 36 clouds 0.22–0.5
     units across. A cloud's centre falls where the surface is hollow or a process (weighted
     by `crevice` and `thin` as well as area). Anchors pick triangles nearer the centre more
     often: a dense core, a wispy rim, bare surface between clouds.
   - They travel inside the column files as a points primitive; the lite file (lite tier,
     phones) holds a third.
   - `ColumnBeads` draws them as a child of the column's mesh, so they turn with it, 3.5–10.5 cm
     off the surface (further out at a cloud's rim), each breathing a little along the normal.
   - They are pocket beads: the pocket size scale, one of the pockets' mixes per cloud, the
     70 / 25 / 5 tiers. Bigger beads come more often at a cloud's core, so they overlap there.
2. **The cards' edges:** three small clouds per card (300 beads, the violet-led pocket mix) at
   the edge nearest the column: just outside its left edge and round its lower left corner, a
   little in front of the glass, clear of the title and the kicker. They move with the card,
   hide while it flies in, and refract its imagery through Stage 3's glass.
3. **Balance:**
   - The free pockets drop from 20 to 10: six further out round the column, four between the
     stops.
   - Their grains drop from 16,000 to 6,000 (phones 1,500).
   - Desktop: 16,000 on the column, 6,000 free, 1,800 at card edges, so 67% of Work's beads cling
     to the column and 75% to the column or the cards.
4. **Clear areas:** a glitter bead inside a keep-clear area (the card in focus, the text) fades
   to 30%. No cloud sits on a focused card's face, and the work list stays legible where the
   column's clouds turn past it.
5. **The dissolve and Depth:** the opened card's dissolve dust and Depth's beads already draw
   with the same glass bead (Stage 3).

Passes:
1. 12,000 anchors in 40 clouds (0.25–0.6). On the column, but thinner than the reference's
   foam.
2. 16,000 in 36 tighter clouds (0.22–0.5), larger beads more often at the core. Dense,
   overlapping cores with bare column between.

**Metrics** (Work recorded on the scripted scroll, HTML UI left out, against the reference;
`compare-frames.mjs --ui`, pass 2): SPARKLE 367 / MP vs 347 (1.06×, within ≤ 2×; loop 2 202).
Mean luminance 30.9 vs 28.4 (loop 2 28.6): the brighter sculpted column and its beads. EMPTY
AREA 58.4% vs 51.1%. Hue distance 0.34: the air, Stage 6.

**Sheet:** `docs/screens/look-pockets.jpg`. The reference Work frames at six moments matched to
our six card stops, against loop 2 and new; then the four pocket crops (reference | loop 2 |
new, 1× and 4×).
- **Closer:** the beads now gather on the column, clinging round its vertebrae and processes in
  clouds of mixed hues, as the reference's do. Loop 2's pockets floated beside it.
- **Closer:** small clouds hug the cards' inner edges, where the reference's gather.
- **Closer:** denser, overlapping cores with real dark space between clouds.
- **Still different:** the reference's clouds are larger and denser at the column, a colourful
  foam that covers whole stretches of it. Ours are patches. Code can fix: more anchors or
  larger clouds, at a cost to file size and fill rate.

**FPS** (production, Retina, 2 s windows, min of two runs, A/B against v3 with rests; pass 2):
| | Work 2.0 | Work 2.35 | Work 2.95 |
|---|---|---|---|
| full · new | 59.9 | 59.8 | 59.9 |
| full · v3 | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · new | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · v3 | 59.8 | 59.9 | 59.9 |

The fade in clear areas and the lite file's third of the anchors came after the measurement.
The fade is one small loop per bead; lite draws the same third it drew then.

**Files:** `spine.glb` 912 KB (the column, 724 KB, and 16,000 anchors), `spine-lite.glb` 422 KB
(358 KB, and 5,333 anchors); both well within 3 MB.

## Stage 5 — a clearly visible mouse effect (tag `look-stage-5`)
Files: `hero/HeroAura.tsx` (the hero's bead field), `shaders/grainMotion.glsl` (the stirred
beads' shimmer), `scripts/record-swipe.mjs` (`SETTLE`).

1. **The hero:**
   - The glass dust round and behind The Core, 150 beads before, is now a sparse but present
     layer of 1,400 beads at 3.4× the dust's size.
   - It keeps the same eight loose clouds at different depths, behind it and at its sides, never
     in front of its centre.
   - At rest it stays calm (mostly dim, a slow twinkle). A swipe drags whole clouds along its
     path.
2. **Work:**
   - Stage 4's clouds on the column and at the cards' edges give a swipe something to move. In
     the recording a medium swipe drags a streak of beads along the cursor's path, which curls
     round it, drifts on and settles within about two seconds (the loop 2 air, unchanged).
   - Stirred beads flare a third brighter than in loop 2 (`grainStirred` × 1.3, capped), on top
     of Stage 3's sparkle.
3. **Kept from loop 2:** each place's strength, the boundaries (Stage 4's fade adds to them: no
   cloud sits on a focused card's face or over the text) and reduced motion (no stirring).

**Video:** `docs/screens/look-cursor.mp4`, 7.7 s at 1440×900, full tier:
- a medium swipe through the hero's lower bead cloud, the clouds stretching along it and
  settling;
- at Work (2.2), a swipe up through a free pocket and the column's cloud into the Kühne+Nagel
  card's edge cloud.

**FPS** (production, Retina, 2 s windows, min of two runs, A/B against v3 with rests;
"moving": the pointer in slow figure-eights the whole time, `fps-place.mjs MOVE=1`):
| | hero idle | hero, cursor moving | Work 2.35, cursor moving |
|---|---|---|---|
| full · new | 59.9 | 59.9 | 59.9 |
| full · v3 | 59.8 | 59.9 | 59.9 |
| lite (HD 630) · new | 59.9 | 59.9 | 59.9 |
| lite (HD 630) · v3 | 59.9 | 59.8 | 59.9 |

The hero's 1,400 beads cost nothing measurable, the lite tier's idle hero included (60 on both
builds today; loop 2's gate saw 52 on both when the machine was warmer).

## Decisions I made
- **The raw model stays out of git.** `spine-raw.glb` is a source asset, possibly licensed for
  use, not for redistribution, and the repository is public. Only the processed,
  compressed column the site loads is committed; `scripts/build-spine.mjs` rebuilds it from the
  raw file. The raw file is git-ignored.
- **Stage 1: copies, not a bent single piece.** The raw file is eight vertebrae, so the brief's
  "short piece" route applies. The joints were the risk. Each copy overlaps the next by exactly
  one vertebra, and the per-copy turn, width and squash ease from one copy's value to the next,
  so both copies agree where they meet. The 0.8–1.2 heights change smoothly from copy to copy,
  so the vertebrae at a joint match.
- **Stage 1: the piece is 6.5 units tall** (vertebrae about 0.8). It came closest to the
  reference's vertebra size beside a card, and its processes still stay clear of the cards at
  every stop. 5.2 read as a thin chain; the cards' positions are locked, so the column could not
  grow further.
- **Stage 1: the detail "normal map" is procedural.** The welded piece has no usable UVs across
  its copies, and a texture would add bytes and a lookup. The carving is two octaves of ridged
  simplex noise in object space with an analytic gradient, inside the existing oil shader
  (`SCULPTED`). The define used to mean "the file has a baked normal map", a path no file ever
  used. The derivative-based bump was dropped for its 2×2-pixel blocks.
- **Stage 1: the column loads after the hero.** `canvas/afterHero.ts` (progress ≥ 0.3, or at once
  on deeper URLs) gates it. Stage 2's videos use the same gate. The procedural column still
  builds in its worker at start-up, as the column shown until the model arrives and as the
  fallback.
- **Stage 1: the spine loader keeps only meshopt.** The build never writes Draco or textures, so
  the Draco and KTX2 loaders are gone from it. Their self-hosted decoders (`public/decoders`,
  1.3 MB of deploy) had no other user and are removed. The meshopt decoder ships inside three's
  JS.
- **Found, left alone:** in the stand-in's path, `oilRoughness` reads the facet value before
  `oilFacets` sets it (three computes roughness before the normal), so the stand-in's patchy
  roughness never took effect. The stand-in is only the fallback now and this round doesn't list
  it, so it is unchanged. The sculpted path computes its carving before the roughness.
- **Stage 2: the capstone's loop is the real recording**, not the fallback: the dashboard woke
  from sleep and was recorded headless. A pointer is drawn into the frames (headless captures
  have none), so the tooltips appear under a cursor as they would for a visitor.
- **Stage 2: Bliggit's loop comes from the two screenshots** (no `demo.mp4`). The front phone
  pans through the home screen at a small zoom (1.06), since a true scroll would need UI that
  doesn't exist. The card's static two-phone drawing moved out of `cardFace.ts` into the loop
  stage (`scripts/loops/phones.ts`): the poster and the loop replace it.
- **Stage 2: the illustrative loops render outside Next.** An esbuild production bundle of the
  same scene code runs in headless Chrome from a script, instead of a hidden route in the site.
  The scenes gained only `view()` and a `detail` multiplier. A one-second crossfade joins
  each seam: the scenes' own motion isn't periodic. The camera drift is periodic, and scene time
  runs at half speed, so the crossfade joins two close views.
- **Stage 2: loops load when their card is first in view**, not when Work is near. At Work the
  neighbouring cards are already in frame, so this loads only what is seen.
- **Stage 2: a VideoTexture subclass, not a plain texture.** Three sizes a plain texture's video
  upload from the element's (zero) width and height, and only a VideoTexture gets mutable
  storage. The subclass marks new frames pending and uploads only on the card's cadence (every
  frame focused or open, every other at rest, every third on lite).
- **Stage 2: an open card's media keeps playing.** Before, the live scene stopped rendering once
  the card had fully broken away; the brief wants the opened card at full rate.
- **Stage 2: one content line added.** The capstone gallery's new first item (the loop) has a
  description for screen readers in `content/site.ts`. The dashboard screenshot keeps its
  cover crop as item 2.
- **Stage 2: a 0.8 MB budget for the 640×400 files, and decimal megabytes** (2.5 MB = 2.5e6
  bytes) everywhere, so any reading of the brief's limit holds.
- **Stage 3: the beads refract a picture of their own, at Work only.** No existing buffer fits:
  three's transmission pass serves only its own materials, and the open card's backdrop picture
  exists only while a card is open. A 0.35× picture of the frame without particles is taken
  each frame while Work is in view on the full tier, the place the brief names (pockets, the
  column, the cards). The other places' beads keep their light without refraction, as lite does.
- **Stage 3: one blending for every bead** (premultiplied: `One, OneMinusSrcAlpha`). It equals
  the old additive blending wherever a bead doesn't refract (alpha 0), so the hero, System,
  Depth and Contact beads look as before apart from the new shading.
- **Stage 3: the second pass, not the first.** The brief asks for a darker core and a bright
  edge. Taken literally over a dark background, that gave hollow bubbles. The kept version has a
  filled body that is still a little darker in the middle, and a thin bright edge.
- **Stage 4: the clouds' anchors are baked into the column files.** Sampling them at load time
  would have cost the main thread tens of milliseconds when the model arrives. Baked offline,
  they are repeatable, with seeded randomness. The lite file carries a third.
- **Stage 4: beads cling as a child of the column's mesh**, so they turn with it and follow it
  through the phone's column scale, with no extra per-frame work.
- **Stage 4: about two thirds on the column, not exactly 60%.** With the free pockets halved and
  the edge clouds added, 67% of Work's beads sit on the column and 75% on the column or the
  cards, the brief's "60% on the column" plus its card clouds.
- **Stage 4: beads fade inside the keep-clear areas** (a focused card, the text). Before, nothing
  kept a cloud off the work list; with the column's clouds turning past it, the list would have
  lost legibility.
- **Stage 5: the hero's beads grow larger, not just more numerous.** At the dust's own size nine
  in ten were under two pixels at the hero's distance. A swipe moved them by loop 2's 44 px,
  but nothing could be seen moving. At 3.4× they are 3–12 px, still mostly dim, so the hero
  stays calm at rest.
- **Stage 5: the air itself is unchanged** (loop 2's strengths, drift and settle). What changed
  is what it moves (the clinging clouds, the hero's beads) and the stirred beads' flare.
