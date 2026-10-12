# Motion Reference — activetheory.net

Companion to `REFERENCE.md`. Stills can't show animation, so this file describes the
**motion** seen in a 2-minute, 60fps screen recording of https://activetheory.net/.
The strips in `docs/reference/motion/` show each moment as a 4×4 grid read
left→right, top→bottom, with **0.5 seconds between tiles** (8 seconds per strip).

If the original video is in `docs/reference/video/`, extract more frames yourself,
e.g. `ffmpeg -ss 12 -t 4 -i <video> -vf fps=10 frames/%03d.png`, and study them.

Same rule as always: match the motion quality and techniques; never copy their logo,
text, projects or exact scenes.

---

## 1. Hero idle — `motion/seg_00.jpg` (0–8s)

The hero is **never still**, but nothing moves fast.

- **The glass object slowly rotates on its vertical axis.** Over ~6–7s it turns from
  facing the viewer to almost edge-on (a thin sliver of glass), then back. The ribbon
  turns with it.
- **The iridescent highlight travels around the rim** as it rotates: a small rainbow spot
  slides along the edge, catching different colors (green → pink → orange → blue).
- **The light color slowly cycles.** Around 4–5.5s the whole glass ribbon picks up a
  **warm copper/red tint**, then returns to cool blue/silver. It feels like a slow light
  change in the environment, not a material change. Cycle ≈ 6–10s.
- Camera: practically static. Cursor gives only a very small, delayed tilt.
- Particles: very faint dust; a few **blue sparks drift upward** near the end, just
  before the scroll starts.

**For us:** The Core should rotate slowly on its own (not only follow the cursor), the
rainbow highlight should slide along the bevels as it turns, and the environment light
should slowly drift between cool and one warm accent.

## 2. Scroll transition into the statement — `motion/seg_12.jpg` (8–14s)

- The camera **descends**. A **cloud of golden particles with smoky wisps** blooms
  around the hero object as the scroll begins.
- A **slanted layer of particles** (a diagonal plane, like a sheet of dust) sweeps across
  the top of the frame. The camera passes **through** it, which acts as a wipe between
  scenes.
- The headline rises from below while the **glass object, now close and edge-on, slides
  in front of the text and refracts it.** Letters behind the glass bend and shift.
- Small mono paragraph fades in at the right a beat later (~0.5s after the headline).

**For us:** scene changes are camera moves through particle layers, never fades to black.
The tagline "Complex inside. Effortless on screen." gets refracted by The Core passing in
front of it.

## 3. Statement idle — `motion/seg_12.jpg`, rows 2–4

- **Glitch displacement on the headline:** one line at a time (roughly every 0.5–1s),
  a horizontal band of the text smears / pixel-shifts sideways for ~0.3s, then snaps
  back. Never more than one line at once. It looks like a data error, then recovery.
- The particle layer above **changes color over time** (teal → gold → red-orange).
- The glass disc stays nearly vertical with tiny rotations.

**For us:** subtle line-by-line glitch on large display text, rare and short. The
"error → recovery" idea fits our story (complex inside, effortless on screen).

## 4. Work cards — `motion/seg_44.jpg` (44–60s)

- The camera slowly orbits / moves down the **central sculpted column**; the column
  itself rotates slowly. Cards sit at different depths and angles.
- **Hover on a card:**
  - the media inside starts playing / changes,
  - the card brightens slightly and turns toward the viewer,
  - the **title scrambles**: letters double and ghost with horizontal offset
    ("SSUUSSTTAINABLE"), then resolve into the clean title over **~1–1.5s**.
- Side cards show titles **stretched / streaked horizontally** (motion-blur scramble).
- **Click:** the card flies to the center and fills the view in ~1s, then dissolves into
  particles while project details appear in small mono type at the left.

**For us:** each job is a glass card. Hover = scramble-resolve title + media starts +
card turns. Click = fly-in, particle dissolve, details on the left.

## 5. Lab exit and loop back — `motion/seg_96.jpg` (96–123s)

- The Lab capsule **rises up and out of frame** as the camera keeps descending.
- The hero ribbon and ring **return from the top**: the world is a vertical loop.
- On the way back, short **particle "scenes" pass by**, each in **its own accent color**:
  - a **crimson/red burst** with concentric arcs (like a radar or sound wave),
  - a **violet/blue bokeh cluster** with grey low-poly shapes behind,
  - a **white point-cloud object** forming out of particles.
- Then everything calms down into the hero idle again.

**For us:** each section/scene owns one accent color within the palette (e.g. teal for
the hero, violet for work, emerald for data, one warm moment for contact). The end flows
back up into The Core.

---

## Timing summary

| Thing | Timing |
|---|---|
| Idle object rotation | one slow turn every ~6–8s, continuous |
| Light color drift | ~6–10s cycle |
| Scroll tick settle | ~0.7s, secondary settle 1.5–2s |
| Cursor response | starts after ~0.8–1s lag, very small amplitude |
| Headline glitch | one line at a time, ~0.3s, every ~0.5–1s |
| Card title scramble → resolve | ~1–1.5s |
| Card fly-in on click | ~1s, then particle dissolve |
| Secondary text after headline | ~0.5s delay |

General feel: slow, continuous, weighty. Nothing snaps except the brief glitches,
which are the only fast moments and make the calm parts feel calmer.
