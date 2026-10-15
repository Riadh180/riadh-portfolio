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
