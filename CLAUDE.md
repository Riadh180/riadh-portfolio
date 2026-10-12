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

**Riadh Souissi** — Senior React / React Native Developer · Data Engineering
Essen, Germany · Open to remote / hybrid · Permanent residency, no sponsorship needed
Email: riadhsouissi@gmx.de (do NOT publish my phone number)

**Audience:** tech leads, CTOs, hiring managers and recruiters at product companies and
agencies. They spend under 60 seconds deciding. The site must make them (1) say "wow",
(2) understand within 10 seconds what I do and how senior I am, and (3) contact me.

**The rare thing about me:** I build polished frontends AND the data infrastructure behind
them. Most people do one. The site must make this obvious through its design, not just its text.

---

## The concept — "SIGNAL"

The whole site is one continuous journey: **raw data becomes a beautiful interface.**

- The world starts as **chaos**: thousands of GPU particles, noisy streams of raw data
  drifting in a dark space.
- As the visitor scrolls, the data is **ingested, transformed and shaped**, like a pipeline
  (extract → transform → load). Particles flow, align into streams, then assemble into
  clean forms: my name, interface shapes, project visuals.
- The end of the journey is **pure, calm, perfect interface**: the contact section.

This metaphor IS my profile: data engineering (the streams) + frontend craft (the
final, polished form). Every section is a "stage" of the pipeline.

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
   and assemble into "RIADH SOUISSI".
2. **Hero:** my name made of particles that react to the cursor; a small mono line types
   out my title.
3. **Experience as pipeline stages:** scrolling moves the camera along a data stream;
   each job is a station where the stream forms a shape related to that work.
4. **The transformation:** one section where noisy streams visibly snap into a clean UI
   layout. This is the core metaphor, made literal.
5. **Contact:** everything goes still and calm. Huge "Let's talk" with a magnetic
   email button. The signal has arrived.
6. **Sound (optional, off by default):** subtle ambient hum + soft UI ticks, with a
   visible toggle.

---

## Content (real — use this)

### Hero
Riadh Souissi — Senior React / React Native Developer · Data Engineering
Tagline idea: *"I turn raw data into interfaces people love."* (improve it if you can)

### About
7.5+ years building production web and mobile apps across fintech, enterprise SaaS and
logistics. I bridge polished frontend delivery with modern data infrastructure.
Languages: English, German, French, Arabic. Based in Essen, Germany.

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

### Data Engineering
Data Engineering Programme, neue fische / SPICED (720 hrs, 2026): Python, SQL, Spark,
Kafka, Airflow, dbt, Docker, AWS (S3, Glue, Redshift, Lambda). Capstone project.

### Skills — show as a living system, not a list
Frontend: React, TypeScript, Next.js, React Native, Expo, Vue.js
Creative: Three.js, WebGL / GLSL, GSAP, Framer Motion
Data: Python, SQL, Spark, Kafka, Airflow, dbt, AWS
Quality: Cypress, Jest, React Testing Library, Sentry, CI/CD (GitLab, GitHub Actions, EAS)

### Contact
riadhsouissi@gmx.de · LinkedIn [add URL] · GitHub [add URL] · CV download (PDF)

---

## Tech stack

- **Next.js (App Router) + TypeScript** (strict)
- **React Three Fiber + drei** for 3D, **@react-three/postprocessing** for bloom,
  noise, chromatic aberration (subtle!)
- Custom **GLSL shaders** for particles (GPU-driven: positions in shaders or FBO/GPGPU,
  never thousands of individual meshes)
- **GSAP + ScrollTrigger** for timelines, **Lenis** for smooth scroll
- Tailwind CSS for layout utilities; design tokens as CSS variables
- Deploy on **Vercel**

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
6. Experience pipeline stations
7. Skills system + Data Engineering section
8. Contact + footer
9. Mobile, reduced motion, WebGL fallback
10. Performance pass, SEO, 404, final polish
