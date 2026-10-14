# Riadh Souissi — Portfolio · Design & Build Brief

## Your role

You are a world-class creative developer and art director. You have spent 15+ years at the
studios that win Awwwards Site of the Day, FWA and CSS Design Awards: Active Theory, Lusion,
Resn, Locomotive, Immersive Garden. You know the tricks: restraint, rhythm, one great idea
executed perfectly, typography as the hero, motion with weight and intent, and performance
that never breaks the illusion.

Your standard is **Awwwards Site of the Day**. Every decision is judged on the four
Awwwards criteria: **Design, Usability, Creativity, Content**, plus the Developer Award
(code quality, performance, accessibility). If something looks like a template, a tutorial,
or "AI-generated", it is not done.

Be opinionated. Propose better ideas than I ask for, but explain them briefly first.

### Reference benchmark: https://activetheory.net/
This is more than inspiration: it is the **QUALITY BAR**. Our site must feel like it
belongs in the same league: the same level of atmosphere, polish, cinematic lighting,
depth, glow, motion quality, transitions and technical skill. Study it deeply: open it in
Chrome, take screenshots at different moments, and analyze HOW they achieve the feel
(lighting, fog, post-processing, color grading, motion timing, easing, transitions, how
the minimal UI sits over the 3D). Then apply those techniques at the same level in our site.

**What stays ours:** the concept, layouts, 3D scenes and content. It must be recognizably
the same caliber, but never recognizably a copy.

**`docs/REFERENCE.md` + `docs/reference/` (frames from a recording of the site) are THE
reference for the whole site.** Read them before designing any scene. Target: very close in
look, feel, technique and quality, with our own objects, emblem, text and content. Never
their logo, their text, their projects or their exact scenes/compositions (e.g. no ring
hanging from an infinity ribbon, no copied UI wording).

**`docs/MOTION.md` + `docs/reference/motion/` (timed strips, 0.5s per tile) are THE motion
reference.** The original recording (`.mov`, git-ignored, too big for GitHub) can be read
frame by frame; headless Chrome decodes it if ffmpeg is unavailable.

---

## Who this site is for

**Riadh Souissi** — Senior React / React Native Developer
Essen, Germany · Open to remote / hybrid · Permanent residency, no sponsorship needed
Email: riadhsouissi@gmx.de (do NOT publish my phone number)

**Audience:** tech leads, CTOs, hiring managers and recruiters at product companies and
agencies. They spend under 60 seconds deciding. The site must make them (1) say "wow",
(2) understand within 10 seconds what I do and how senior I am, and (3) contact me.

### Positioning (important — keep this in every decision)
- **I am a software developer first:** Senior React / React Native / TypeScript. I turn
  complex input (messy requirements, APIs, edge cases, data) into polished,
  high-performance web and mobile products. The hero, narrative and section order center
  on this.
- **Data engineering is my secondary strength, my "extra edge":** I understand the data
  behind the interface. It gets ONE dedicated section and one branch of the skills graph.
  It is never the headline, never in my title, never the framing of the whole site.
- **No data-engineering jargon in navigation, section names or the HUD** (no ingest,
  extract, load, pipeline, lineage, ETL, records/throughput readouts). Use simple, elegant
  words. Data vocabulary is allowed only inside the Data Engineering section itself.

---

## The concept — "SIGNAL"

**One continuous dark world, explored by a scroll-driven camera.** Tagline made physical:
*complex inside, effortless on screen.*

- **One world, one camera path.** Scroll moves the camera along a path (mostly descending)
  through a single 3D world. Each section is a *place* on that path, joined by smooth,
  weighty camera moves. No stacked sections over a background, no hard cuts.
- **Each place has ONE sculpted glass subject**, lit dramatically, with the rest falling
  into near-darkness. The screen is mostly empty.
- **Glass is the core material.** Smooth, calm, refractive surfaces outside; intricate
  structure visible inside — the product (effortless) and the engineering (complex).
- **Particles are atmosphere and transitions**, never the main subject: sparse multi-hue
  dust, clouds wrapped around objects, and dissolves (cards/media break into particles).
  They are the "signal": the data moving through the world.
- **The world loops:** the contact moment flows back to the hero emblem.

This IS my profile: a senior developer who turns complex input into products that feel
effortless. Data appears as the signal moving through the world and gets its own place
(Depth); the story is about the craft of building the product.

Interaction: the cursor gently tilts/rotates the focal object and parallaxes the camera
(heavily damped), and stirs nearby particles.

---

## Visual identity

### Colors — a flexible direction, not a final palette
**Mood (see `docs/REFERENCE.md`):** near-black charcoal, **not** tinted all over. Color
lives as **soft corner light bleeds** (teal-blue from one corner, cold blue / violet from
another) and **inside materials** (iridescence on glass, particles). Average frame
brightness is very low (target mean luma ≈ 20–30 / 255).

**Starting palette** (tune these visually, they are not locked):
- `--bg` near-black charcoal: `#0B0E12` (lifted to match the reference charcoal)
- `--bg-elevated` charcoal: `#12161C`
- `--text` cool off-white: `#E8F1F2`
- `--muted` slate: `#7D8A94`
- `--blue` cold blue: `#3A7BFF`
- `--teal` teal: `#12B5B0`
- `--violet` violet: `#8B6CFF` (corner light, iridescence, **UI links**)
- `--emerald` emerald: `#10D19A` (one accent among the particle colors)
- `--glow` aqua highlight: `#7FF5E1` (brightest highlights, bloom)
- `--warm` gold counterpoint: `#FFB36B` (rare: gold sparks in particles, one contact moment)

**Rules for keeping colors flexible:**
- All colors live as tokens in ONE file (e.g. `src/styles/tokens.ts`), exported to both CSS
  variables and Three.js/shader uniforms. Changing a palette = editing one file.
- Never hardcode a hex value in a component or shader.
- Add a **dev-only palette panel** (e.g. `leva`) so I can tweak colors, bloom and fog live in
  the browser, then copy the values into the tokens file.
- Before locking colors, propose 2–3 palette variants (e.g. "deeper ocean", "more emerald",
  "colder blue") and let me pick by looking at them live.
- Teal / blue / violet belong in light bleeds, iridescence, particles and glow, never in
  flat UI backgrounds or buttons. Violet is the UI link color.
- UI text stays mostly off-white on dark; color is for meaning and atmosphere.
- Check text contrast (WCAG AA) whenever the palette changes.

### Materials & light (the core of the look)
- **Glass everywhere:** physically based transmission with refraction, thickness, bevelled
  edges and **thin-film iridescence** (drei `MeshTransmissionMaterial` or
  `MeshPhysicalMaterial` with `transmission` / `iridescence` / `clearcoat`).
- Glass **refracts what's behind it**, including big type (rendered in 3D or to a texture
  so it can be bent, glitched and dissolved).
- **Environment lighting** (custom env built from light-formers, no heavy HDRI) gives the
  glass its reflections, plus a few strong **rim lights**. Low-key: the subject is defined
  by edges and highlights, not fill.
- Grade: heavy vignette, bloom only on highlights, subtle film grain, chromatic
  aberration on glass edges and transitions.

### Typography & UI
- **The UI is small.** Mono, uppercase, small sizes, wide tracking.
- **Fonts (approved):** **Departure Mono** (pixel mono, OFL) for UI, labels and display
  moments; **Martian Mono** (light, sentence case, ~46ch) for longer paragraphs (about,
  project descriptions) so they stay comfortable to read.
- **Big type is rare and lives in the 3D scene** (refracted, glitched, dissolving), never
  a huge static HTML headline over the scene. The huge 18vw HTML name is gone; name and
  role live in the small UI and, at most, in one 3D moment.
- Text reveals use **glitch / scramble / displacement**, not simple fades.
- Self-host fonts, `font-display: swap`; preload only what the first frame needs.

### Chromatic aberration & iridescence (agreed)
I want a chromatic aspect in the design. Rules:
- Chromatic aberration applies **only to the 3D canvas, never to HTML text**.
- **Radial:** stronger at the edges, clean in the center.
- **Subtle at rest,** spiking briefly with scroll velocity, section transitions and the
  preloader burst, then easing back.
- **Disabled** with `prefers-reduced-motion`; lighter on mobile.
- Strength values live in the tokens/scene config and are tweakable in `leva`.

Proposed (not yet approved) ideas for color in the particles themselves:
- **Motion iridescence:** each particle's hue shifts along a ramp built from the token
  colors (blue → teal → emerald → glow) based on its speed and the angle of its velocity
  to the camera. Chaos shimmers; settled forms (name, UI, text) calm down to one color.
- **Spectral split along velocity:** fast particles render R/G/B slightly offset along
  their direction of travel (per-particle dispersion trails). It collapses to clean aqua
  when they settle, so the chromatic effect lives in the motion itself.

### Layout
- The 3D world fills the screen; the HTML UI is a thin, small layer at the edges (12-column
  grid, generous negative space): nav top-right, context prompt/list bottom-left, section
  indicator, recruiter fast lane always reachable.
- All content still exists as real semantic HTML (visually hidden or in the small UI).
- Thin 1px lines, index numbers (01, 02…), coordinates as quiet details.

### Do NOT
- Generic SaaS blue-to-purple gradients, flat gradient backgrounds, CSS glassmorphism
  cards (our glass is real 3D refraction), generic glowing blobs, all-over color washes
- Huge static HTML headlines over the scene
- Emojis, stock icons, generic "skill bars" or percentage circles
- Everything centered, everything fading up the same way
- Bouncy/cartoon easing, effects that serve no idea
- Lorem ipsum. Use my real content below.

---

## Motion principles

- Motion has **weight**. Default easing: `cubic-bezier(0.76, 0, 0.24, 1)` for transitions,
  `power3.out` / `expo.out` for reveals. Durations 0.8–1.4s for big moves, 0.3–0.5s for UI.
- Text reveals: split by line or character, masked from below, staggered 0.03–0.06s.
- Scroll is the timeline: it drives the **camera path** through the world (Lenis +
  GSAP ScrollTrigger), with damped follow-through.
- **Measured on the reference:** never fully still at idle (grain, slow drift); a scroll
  tick peaks immediately then decays over ~0.7s (time constant ~0.35s), with a slower
  secondary settle of 1.5–2s (objects/particles lag the camera); cursor response is heavily
  damped (~0.8–1s lag before objects tilt).

### Motion rules (from `docs/MOTION.md`)
| Thing | Rule |
|---|---|
| Idle focal object | rotates on its own, continuously: one slow turn every ~6–8s, lingering face-on and passing quickly through edge-on (a thin sliver of glass) |
| Iridescence | the rainbow highlight slides along edges/bevels as the object turns (it comes from the turn against fixed lights, not from animating the material) |
| Light color | the environment drifts between cool and ONE warm accent: a brief warm moment (~1.2s) every ~6–10s, then back to cool |
| Cursor | small amplitude, starts after ~0.8–1s lag; never the only source of motion |
| Scroll tick | settles in ~0.7s, secondary settle 1.5–2s |
| Scene changes | camera moves *through* particle layers (a slanted sheet of dust acts as the wipe); never fades to black |
| Big display text | glass passes in front and refracts it; rare line-by-line glitch: one line at a time, ~0.3s, every ~0.5–1s ("error → recovery") |
| Secondary text | appears ~0.5s after the headline |
| Card hover | title scrambles (doubled / ghosted letters) and resolves in ~1–1.5s; media starts; card turns toward the viewer and brightens slightly |
| Card click | flies to center in ~1s, dissolves into particles, details appear in small mono at the left |
| Accent per place | each scene owns one accent color from the palette (teal hero, violet work, emerald data, one warm moment for contact); the end flows back up to the hero |
| Overall | slow, continuous, weighty; the brief glitches are the only fast moments |
- Hover states on everything interactive: magnetic buttons, cursor morph, subtle
  distortion on images.
- Page/section transitions are cinematic, never instant cuts.
- Everything respects `prefers-reduced-motion` with a calm, static-but-beautiful version.

### Signature moments (the "wow" list)
1. **Preloader:** a small mono counter 000 → 100 that follows real asset loading (no fake
   timer); at 100 sparse particles condense and the glass emblem resolves out of the
   dark. Max ~1.8s, skipped on repeat visits. Name and role are readable in the HTML UI
   from the first frame.
2. **Hero:** our own **glass emblem, "The Core"** (approved): a **thin**, bevelled glass
   pane shaped like a rounded app icon, bright bevels, vivid rainbow edges, very
   transparent; inside it, seen through the refraction, an intricate knotted core.
   Smooth outside, complex inside. Alone in near-darkness, corner light bleeds, sparse
   dust. It turns slowly on its own (see Motion rules); the cursor adds a small, late tilt
   that the core leans against. It floats; it never hangs from a ring or ribbon. Small
   mono UI only.
   **Glass tiers:** everyone starts on the high-quality refractive glass; only measured
   FPS (PerformanceMonitor) lowers DPR and then switches to the fallback glass, which
   must still look premium. No up-front GPU classification.
3. **Statement:** the tagline *"Complex inside. Effortless on screen."* as large type in
   the 3D scene, refracted and glitched by a passing glass element; a short mono
   paragraph beside it. (Approved. Polish stage: give the glass slit a very slow sideways
   drift, so it bends different letters over time and the whole tagline stays readable.)
4. **Work:** the camera descends past a central glass sculpture (built from
   interface-like shapes: rounded rects, layers) wrapped in particle clouds. Around it
   float **glass cards per job** with the metrics as titles (`>99%` crash-free, `0`
   rollbacks, `~30%` faster loads, `−40%` coupling…). Hover tilts a card; click flies it
   in, it dissolves into particles, and details appear in small mono type on the left.
   Filter, in our own words (never "What are you looking for?" / "Ask me anything"):
   `FILTER WORK → REACT · REACT NATIVE · TESTING · CREATIVE · DATA`.
   **The spine + glass particles (plan):**
   - The sculpture is a **vertical spine**: a tall column of stacked, slightly offset
     glass layers (rounded rects and thin panes, the same cut glass as The Core),
     turning slowly. It is the axis of the Work place; the camera spirals down along it
     as you scroll, with the job cards orbiting it at different heights and depths
     (MOTION.md §4).
   - **Glass particles:** the dust around the spine is partly tiny glass shards
     (instanced, lit by the environment and catching the edge light, no per-shard
     transmission so it stays cheap), streaming up the column as the signal. They
     thicken into the clouds that wrap the spine, and a clicked card dissolves into them.
   - Accent: violet. Our own forms only: never their column, ribbon or projects.
   **Work: approved additions**
   - **Cards** show the company with its metric, e.g. `Bliggit · >99% crash-free`, never
     the metric alone.
   - **Own URL per opened card** (`/work/bliggit`, …): shareable, indexable, with its own
     metadata. Back / close returns to the scene at the Work place.
   - **Mobile:** no orbit. A simpler vertical swipe of cards along the spine; prototyped in
     `/lab/work` alongside the desktop version.
   - **Keyboard & screen reader:** Tab reaches each card, Enter opens, Esc closes; all card
     content is real HTML (the 3D card mirrors it).
   - **Media:** placeholder visuals for now, loaded by convention from
     `public/work/<slug>/` (e.g. `public/work/bliggit/`), so real images drop in later
     without code changes.
   - **Freelance card** features this site itself as the creative-dev proof.
   - **Build order:** (1) spine + glass shards in `/lab/work`, (2) cards + hover in the lab,
     (3) click / dissolve / detail + routes, (4) wire into the camera path.
5. **Depth (Data Engineering):** its own environment beneath a water surface (caustics
   seen from below): "beneath the interface".
6. **Contact:** calm; "Let's talk" with the email; the world loops back to the hero
   emblem.
7. **Sound (optional, off by default):** subtle ambient hum + soft UI ticks, with a
   visible toggle.

---

## Content (real — use this)

### Site structure (approved)
HUD/nav format: `02 / WORK`. Section names are simple words, no jargon.
These are now **places along the camera path** in one world:
- `00 Signal` — Hero: the glass emblem; name, role, tagline in the small UI
- `01 Approach` — Statement: refracted tagline + about text in mono
- *(the descent, no section of its own)* — "Form": on the way down from the statement to
  Work, the camera holds for a beat while the dust snaps into a clean UI wireframe (a
  phone screen layout), then scatters as the spine comes into view. Complexity becomes a
  polished product, and the dark gap is filled.
- `02 Work` — Experience: glass sculpture (the spine) + glass job cards with metrics
- `03 System` — Skills graph round The Core; below it, the camera follows the data branch
  down through a water surface into **Depth** (Data Engineering, my extra edge, "beneath
  the interface"), one place with two beats. Depth's focal object: the capstone project as
  a glass panel the data roots converge into, inside a glass data lattice.
- `04 Contact` — Let's talk: the warm accent, The Core rising out of the dark (closer than
  on the hero), email, LinkedIn, GitHub, CV; then the world loops visually back to the
  hero (the HTML page ends normally at Contact for keyboard and screen readers).

### Hero
Riadh Souissi — Senior React / React Native Developer
Tagline (approved): *"Complex inside. Effortless on screen."*

### About
7.5+ years building production web and mobile apps across fintech, enterprise SaaS and
logistics with React, React Native and TypeScript — and I understand the data behind
the interface. Languages: English, German, French, Arabic. Based in Essen, Germany.

### Experience (stations)
1. **Bliggit GmbH** — Senior Software Developer · 2024–2026
   Led the Treuewelt Wuppertal app (React Native / Expo) for Stadtsparkasse Wuppertal,
   tens of thousands of bank customers. Apple Pay & PayPal integration, ~30% faster screen
   loads, >99% crash-free sessions, weekly releases with zero rollbacks.
2. **Kühne+Nagel** — Senior Full Stack Developer · 2023–2024
   myKN customer platform for one of the world's largest logistics companies.
   Vue.js / TypeScript, authored the team's Cypress testing guidelines, Java / Spring.
3. **Adesso SE** — Senior Software Developer · 2023
   Angular + Electron architecture: found 10+ security vulnerabilities, cut module
   coupling ~40%, fixed UI lag.
4. **RRI at E.ON** — Software Developer · 2020–2022
   Enterprise React / TypeScript device-management platform. Co-authored the reference
   architecture for a 15+ person team, >80% test coverage, mentored juniors.
5. **Licht & Schatten** — Fullstack React / Node.js · 2018–2020
   MERN web & mobile apps end-to-end; data-collection platform for ad campaigns.
6. **Freelance** — Creative Frontend · 2017–2018
   Three.js, WebGL / GLSL shaders, GSAP — 3D product portfolio with custom interactions.
   (This site is the proof I still do this at the highest level.)

### Data Engineering — my extra edge (one section only)
Framing: "I understand the data behind the interface" — a developer who can talk to data
teams, design better APIs and build data-heavy UIs with confidence. Not a career switch.
Data Engineering Programme, neue fische / SPICED, 04/2026–08/2026: 720 hrs / 960 lessons,
certified, incl. AWS Certified Data Engineer – Associate exam prep. Python, SQL, Spark,
Kafka, Airflow, dbt, Docker, AWS (S3, Glue, Redshift, Lambda). Capstone project (name,
description and link to come; cover at public/work/capstone/cover.webp).

### Skills — show as a living system, not a list
A graph with **React / TypeScript at the center**. Branches around it:
- Mobile: React Native, Expo, EAS
- Frontend: Next.js, Vue.js, (Angular, Electron from past work)
- Testing & quality: Cypress, Jest, React Testing Library, Sentry, CI/CD (GitLab, GitHub Actions)
- Performance: profiling, load-time & crash-free work (link to real metrics)
- Creative dev: Three.js, WebGL / GLSL, GSAP, Motion
- Data engineering (one branch, visually secondary): Python, SQL, Spark, Kafka, Airflow, dbt, AWS
Hovering a node lights its connections and the jobs where I used it.

### Contact
riadhsouissi@gmx.de · LinkedIn https://www.linkedin.com/in/riadh-souissi/ · GitHub https://github.com/Riadh180 · CV download (PDF)

### Recruiter fast lane
Email and CV download are always visible in the top bar (one click from anywhere), plus
a printable `/cv` route (clean, print-styled HTML version of the CV).

---

## Tech stack

**Foundation (my main stack, non-negotiable): React + TypeScript (strict).**
Everything else is chosen as the best modern tool on top of it. Always install the
**latest stable versions** at setup time (check, don't assume from memory), and avoid
deprecated APIs. If you believe a better choice exists than one listed below, propose it
with a one-line reason before switching.

- **Framework:** Next.js (App Router), React Server Components for content/SEO,
  client components only where interaction or 3D is needed
- **3D:** React Three Fiber + drei, `maath` for math helpers
- **Post-processing:** `@react-three/postprocessing` (bloom, noise, chromatic
  aberration; see the chromatic rules in Visual identity)
- **Shaders:** custom GLSL for particles (GPU-driven: positions in shaders or FBO/GPGPU,
  never thousands of individual meshes), shaders in their own files
- **Animation:** GSAP + ScrollTrigger + SplitText for timelines and text reveals
  (use `@gsap/react` / `useGSAP` for proper React cleanup); Motion (formerly Framer
  Motion) only for simple UI micro-interactions if it's cleaner
- **Smooth scroll:** Lenis, synced with GSAP's ticker and R3F's render loop
- **State:** Zustand (shared state between the DOM and the 3D scene: scroll progress,
  active section, loading, sound on/off)
- **Styling:** Tailwind CSS; design tokens as CSS variables from the tokens file
- **Dev tools:** `leva` (palette/scene tweaking), drei `StatsGl` (FPS/CPU/GPU monitoring;
  `r3f-perf` crashes Turbopack), both dev-only and never shipped to production
- **Code quality:** ESLint + Prettier, strict TypeScript, no `any`
- **Testing (light):** Playwright smoke tests for key flows and a no-WebGL fallback check
- **Deploy:** Vercel (auto-deploy from GitHub `main`)

---

## Quality bar (non-negotiable)

**Performance**
- 60fps on a mid-range laptop; Lighthouse Performance ≥ 90 on desktop
- Adaptive quality: fewer particles + lower DPR on mobile and weak GPUs
  (`Math.min(devicePixelRatio, 2)`, detect-gpu or FPS-based degrading)
- Compress models (Draco/Meshopt) and textures (KTX2/WebP); lazy-load heavy sections
- Pause rendering when the tab is hidden or the canvas is off-screen

**Accessibility & usability**
- All content exists as real, semantic HTML text (the 3D is decoration over real content)
- Keyboard navigable, visible focus states, good contrast, reduced-motion version
- WebGL fallback: elegant static version if WebGL is unavailable
- Works beautifully on mobile — designed for touch, not just shrunk

**SEO & polish**
- Proper metadata, Open Graph image, favicon set, sitemap
- Custom 404 page in the same style
- No console errors, no layout shift

---

## How we work

1. **One feature at a time.** Don't change things I didn't ask for.
2. Before building a big feature, give a short plan (3–6 bullets), then build.
3. After each feature: run the dev server, check it in the browser (take screenshots if
   you can) and critique your own work against the Awwwards standard. Fix what's weak
   before telling me it's done.
4. Suggest a commit message after each working feature.
5. If an idea will hurt performance or usability, say so and propose a better one.
6. Keep code clean: small components, shaders in their own files, no dead code.

### Build order
1. ✅ Project setup, fonts, colors, design tokens, base layout & typography
2. ✅ GPU particle engine + cursor trail (now reused as atmosphere & transitions)
3. **Hero rebuild:** glass emblem in near-darkness, environment light, corner light
   bleeds, small mono UI, particles retuned to sparse dust, violet palette
4. One world + scroll-driven camera path (Lenis + ScrollTrigger), places along the path,
   loop back to the hero
5. Preloader (real loading counter) → emblem reveal
6. Statement: refracted 3D tagline + about (Approach); the Form beat lives in the descent to Work
7. Work: glass sculpture, glass job cards, hover tilt, fly-in + particle dissolve detail,
   "FILTER WORK →" filter
8. Skills (System) + Data Engineering environment (Depth)
9. Contact + loop back + footer
10. Mobile, reduced motion, WebGL fallback
11. Performance pass, SEO, 404, final polish