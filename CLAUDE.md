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

The whole site is one continuous journey: **complexity becomes a polished product.**

- The world starts as **chaos**: thousands of GPU particles, noisy streams drifting in a
  dark space — the messy input every real product starts from.
- As the visitor scrolls, the chaos is **shaped by craft**. Particles flow, align, then
  assemble into clean forms: my name, interface layouts, project visuals, and finally
  real HTML text (particles sample the DOM glyph positions, then crossfade into crisp,
  selectable text).
- The end of the journey is **pure, calm, perfect interface**: the contact section.

This metaphor IS my profile: a senior developer who takes complex input and ships
products that feel effortless. The data streams hint at my extra edge (I understand the
data behind the interface), but the story is about the craft of building the product.

**One particle system for the whole site:** a single GPGPU simulation in a fixed canvas
behind the page; every form is a target, and scroll blends between targets. No separate
scenes per section, no hard cuts.

Mouse interaction: the cursor is a force in the field. Particles are attracted, repelled
or bent by it, so visitors feel they are touching the data.

---

## Visual identity

### Colors — a flexible direction, not a final palette
**Mood:** in the direction of the Active Theory website: deep, oceanic darkness, with
color living *inside the 3D scene* as light: blue drifting into emerald, glowing aqua
highlights, atmospheric depth. Use it as inspiration only; never copy their exact palette.

**Starting palette** (tune these visually, they are not locked):
- `--bg` deep blue-black: `#050B12`
- `--bg-elevated` dark navy: `#0B1622`
- `--text` cool off-white: `#E8F1F2`
- `--muted` slate: `#7D8A94`
- `--blue` electric blue: `#3A7BFF`
- `--teal` deep teal: `#12B5B0`
- `--emerald` emerald: `#10D19A`
- `--glow` aqua highlight: `#7FF5E1` (for the brightest particles, bloom, key accents)
- `--warm` optional counterpoint: `#FFB36B` (used very rarely, e.g. one hover or the contact moment)

**Rules for keeping colors flexible:**
- All colors live as tokens in ONE file (e.g. `src/styles/tokens.ts`), exported to both CSS
  variables and Three.js/shader uniforms. Changing a palette = editing one file.
- Never hardcode a hex value in a component or shader.
- Add a **dev-only palette panel** (e.g. `leva`) so I can tweak colors, bloom and fog live in
  the browser, then copy the values into the tokens file.
- Before locking colors, propose 2–3 palette variants (e.g. "deeper ocean", "more emerald",
  "colder blue") and let me pick by looking at them live.
- Blue→emerald gradients belong in light, particles, fog and glow, not in flat UI
  backgrounds or buttons.
- UI text stays mostly off-white on dark; color is for meaning and atmosphere.
- Check text contrast (WCAG AA) whenever the palette changes.

### Typography
- Display: a characterful grotesk at huge sizes (e.g. **Clash Display** or **General Sans**
  from Fontshare, free). Headlines 10–18vw, tight tracking (-0.04em), line-height ~0.9.
- Body: a clean neutral sans (e.g. **Satoshi** or **Inter Tight**).
- Mono: for data labels, numbers, metadata (e.g. **JetBrains Mono**), small, uppercase,
  wide tracking. This gives the "data" feel.
- Self-host fonts, preload the display font, `font-display: swap`.

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
- Strict 12-column grid with generous negative space. Asymmetry is good; chaos is not.
- Large type that breaks the grid on purpose, small mono metadata that respects it.
- Thin 1px lines, index numbers (01, 02…), coordinates and timestamps as decorative
  data details.

### Do NOT
- Generic SaaS blue-to-purple gradients, flat gradient backgrounds, glassmorphism cards,
  generic glowing blobs
- Emojis, stock icons, generic "skill bars" or percentage circles
- Everything centered, everything fading up the same way
- Bouncy/cartoon easing, effects that serve no idea
- Lorem ipsum. Use my real content below.

---

## Motion principles

- Motion has **weight**. Default easing: `cubic-bezier(0.76, 0, 0.24, 1)` for transitions,
  `power3.out` / `expo.out` for reveals. Durations 0.8–1.4s for big moves, 0.3–0.5s for UI.
- Text reveals: split by line or character, masked from below, staggered 0.03–0.06s.
- Scroll is the timeline: tie the 3D scene to scroll progress (GSAP ScrollTrigger + Lenis).
- Hover states on everything interactive: magnetic buttons, cursor morph, subtle
  distortion on images.
- Page/section transitions are cinematic, never instant cuts.
- Everything respects `prefers-reduced-motion` with a calm, static-but-beautiful version.

### Signature moments (the "wow" list)
1. **Preloader:** a mono counter 000 → 100 while particles gather; at 100 they burst
   and assemble into "RIADH SOUISSI". Max ~1.8s. The counter follows real asset loading
   (no fake timer). Skipped on repeat visits. My name and role are readable as real HTML
   from the first frame, so the preloader never blocks the content.
2. **Hero:** my name made of particles that react to the cursor; a small mono line types
   out my title.
3. **Experience as pinned stations:** each job is pinned while the particle stream keeps
   flowing through and forms a simple shape related to that work. The metrics are the
   hero type (`>99%` crash-free, `0` rollbacks, `~30%` faster loads, `−40%` coupling).
   No long camera fly-through.
4. **The transformation:** one section where noisy streams visibly snap into a clean
   mobile/web UI layout. This is the core metaphor (complexity → polished product), made
   literal.
5. **Contact:** everything goes still and calm. Huge "Let's talk" with a magnetic
   email button. The signal has arrived.
6. **Sound (optional, off by default):** subtle ambient hum + soft UI ticks, with a
   visible toggle.

---

## Content (real — use this)

### Site structure (approved)
HUD/nav format: `01 / FORM`. Section names are simple words, no jargon.
- `00 Signal` — Hero: name from particles, title, tagline
- `01 Approach` — About: who I am, how I work
- `02 Form` — Transformation: chaos snaps into a polished UI
- `03 Work` — Experience: pinned stations with metrics
- `04 System` — Skills graph
- `05 Depth` — Data Engineering, my extra edge ("beneath the interface")
- `06 Contact` — Let's talk

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
Data Engineering Programme, neue fische / SPICED (720 hrs, 2026): Python, SQL, Spark,
Kafka, Airflow, dbt, Docker, AWS (S3, Glue, Redshift, Lambda). Capstone project.

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
riadhsouissi@gmx.de · LinkedIn [add URL] · GitHub https://github.com/Riadh180 · CV download (PDF)

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
- **Dev tools:** `leva` (palette/scene tweaking), `r3f-perf` (FPS/GPU monitoring),
  both dev-only and never shipped to production
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
1. Project setup, fonts, colors, design tokens, base layout & typography
2. 3D particle field background + cursor interaction
3. Preloader → hero assembly ("RIADH SOUISSI" from particles)
4. Smooth scroll + scroll-driven camera
5. About + transformation section
6. Experience stations (pinned, metrics-led)
7. Skills graph + Data Engineering ("extra edge") section
8. Contact + footer
9. Mobile, reduced motion, WebGL fallback
10. Performance pass, SEO, 404, final polish