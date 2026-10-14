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
