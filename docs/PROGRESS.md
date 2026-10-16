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
