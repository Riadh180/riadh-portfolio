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
