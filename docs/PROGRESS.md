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
