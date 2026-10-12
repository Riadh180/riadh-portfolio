# Visual Reference — activetheory.net

Screenshots in `docs/reference/` are frames from a screen recording of
https://activetheory.net/ (a scroll through the whole homepage, ~2 minutes).
This is the **quality and style benchmark** for the whole site. Study every image before
designing a scene. Open the live site in Chrome as well, because motion matters as much as stills.

**Goal:** a site that feels like it was made by the same studio, at the same level. It
should be very close in look, feel, technique and polish. **Not allowed:** their logo, their
text, their client projects or their exact scenes. Every object, layout and word is ours.

---

## What the reference actually looks like (frame by frame)

| Frame | What happens |
|---|---|
| `at_01` | **Hero.** Almost empty dark space. One small **glass logo ring** hangs from a thin glass ribbon shaped like an infinity loop, in the center. Iridescent rainbow highlights on its rim. Soft teal light bleeds in from the bottom-left corner. Tiny UI only. |
| `at_02` | Scrolling. The ring is caught in **sparse golden/white particles and wisps**, and the camera starts to descend. |
| `at_03` | **Statement.** Big mono/pixel headline "CREATIVE DIGITAL EXPERIENCES". A **glass disc passes in front of it and refracts and distorts the text** (glitchy displacement). Small mono paragraph on the right. |
| `at_04`–`at_07` | **Work.** The camera moves down a **central sculpted column** of iridescent organic glass shapes wrapped in **colorful particle clouds** (purple, teal, pink, green). Around it float **3D project cards**: rounded rectangles with **thick glass frames and bevelled edges**, video textures inside, title text on top. Cards sit at different depths and angles. |
| `at_08` | **Project opened.** One card flies to the center and fills the view; it **dissolves into particles** as it transitions. Project info appears in small mono type on the left with "PROJECT LINK" and "← CLOSE". |
| `at_09` | Card in "close" state: dark, the media fading out in a smoky particle wipe. |
| `at_10` | **Lab.** A different environment: a dark metal **cage / machine structure with cables**, particles falling inside, a **wet reflective floor**. |
| `at_11` | Lab title. **Water surface with caustics seen from below** at the top. A large **hexagonal glass lens / capsule** with "// THE LAB →" in mono type. |
| `at_12`–`at_13` | **Loop back.** The glass ribbon and ring return, wrapped in particles, and the scene resets to the calm hero. The site is a loop, not a page with an end. |

---

## The techniques that make it look like this

### Scene & camera
- **One continuous 3D world**, not sections stacked over a background. Scroll drives a
  **camera path** through the world (mostly descending vertically). Different "rooms"
  (hero, statement, work, lab) are places along the path, joined by smooth camera moves.
- **Each moment has ONE sculpted focal subject** lit dramatically, and the rest falls into
  darkness. The screen is **mostly empty**.
- The world **loops**: the end returns to the start.

### Materials (the biggest difference from what we have)
- **Glass everywhere:** physically based transmission with **refraction**, thickness,
  bevelled edges, and **thin-film iridescence** (rainbow sheen on edges). In R3F: `MeshTransmissionMaterial`
  from drei (with `chromaticAberration`, `anisotropy`, `distortion`, `iridescence`), or
  `MeshPhysicalMaterial` with `transmission`, `iridescence`, `clearcoat`.
- Glass **distorts what's behind it**, including the headline text (text rendered in 3D
  or to a texture so refraction can bend it).
- **Environment lighting** (an HDRI or custom env map) gives the glass its reflections;
  a few strong **rim lights**.

### Light & color grading
- Near-black / charcoal base (`~#07090C`), **not** tinted all over.
- Color appears as **soft corner light bleeds** (teal-blue bottom-left, cooler blue right)
  and **inside materials** (iridescence, particles).
- Accent palette: **teal / aqua, cold blue, violet-purple**, with small **pink, gold and
  green** sparks in the particles. Purple is used for UI links.
- Heavy **vignette**, soft **bloom** only on highlights, subtle **film grain**,
  **chromatic aberration** on glass edges and transitions.

### Particles
- Used as **atmosphere and transitions**, never as the main subject: sparse dust, colorful
  clouds wrapped around objects, and **dissolve effects** (cards and media break into
  particles when opening/closing).
- Particle colors vary (multi-hue sparkles), sizes vary, many are tiny.

### Typography & UI
- **Very small UI.** Mono / pixel-style typeface, uppercase, small sizes.
- **Top-right pill nav** ("WORK ~ CONTACT") with a tiny animated line between items, and a
  small "<< SECTION NAME >>" indicator below it.
- **Left side:** a small prompt "WHAT ARE YOU LOOKING FOR?" with a list of filter links
  in purple ("→ WEBSITES"…), and an "ASK ME ANYTHING…" input pill below.
- Big type appears **rarely** and is **part of the 3D scene** (refracted, glitched,
  dissolving), not static HTML laid over it.
- Text reveals use **glitch / scramble / displacement**, not simple fades.

### Interaction & motion
- Cursor subtly **rotates / tilts objects** and parallaxes the camera.
- Hover on project cards: they tilt toward the cursor, media plays.
- Click: cinematic **fly-in** to the card, **particle dissolve** transition.
- Motion is slow, smooth and weighty; nothing snaps.

---

## How to translate this into OUR site (keep our identity)

| Reference element | Our version |
|---|---|
| Their glass logo ring on a ribbon | **Our own glass emblem**: an "RS" monogram or an original abstract glass form, hanging or floating in the hero |
| "Creative digital experiences" refracted headline | Our tagline **"Complex inside. Effortless on screen."** refracted by a passing glass element |
| Central iridescent column + particle clouds | Our own **central sculpture** for the Work section, e.g. an abstract glass structure built from interface-like shapes (rounded rects, layers), wrapped in particles |
| Glass project cards with video | **Glass cards for each job/project** (Bliggit/Treuewelt, Kühne+Nagel, Adesso, E.ON…) with screenshots or abstract visuals, metrics as the title |
| Card dissolve → project detail | Same technique: card flies in, dissolves into particles, details in small mono type on the left |
| The Lab environment | Our **Data Engineering "Depth" section** as its own environment (below a water surface = "beneath the interface") |
| "What are you looking for?" filter | **"What are you looking for?" → React · React Native · Testing · Creative dev · Data** filtering the work |
| "Ask me anything" input | Optional later: a small AI chat about my experience. Otherwise a direct email pill |
| Loop back to the hero | Contact section flows back to the hero emblem |

## What changes from the current build
- The **huge 18vw HTML name and big section headings over the field go away.** Name and role
  live in the small UI and, at most, in one 3D/refracted moment.
- The **even, all-over particle streams become sparse atmosphere** and transition effects.
- The **all-over green/blue wash** becomes a near-black base with corner light bleeds.
- **Glass + iridescence + refraction** becomes the core material language.
- The palette adds **violet/purple** next to teal/blue; emerald becomes one accent among the
  particle colors. (Colors stay token-driven and tweakable.)

## Accessibility & recruiters (still non-negotiable)
All content still exists as real semantic HTML (visually hidden or in the small UI), with a
reduced-motion and no-WebGL version, and email + CV always one click away.
