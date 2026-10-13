export const profile = {
  name: 'Riadh Souissi',
  role: 'Senior React / React Native Developer',
  tagline: 'Complex inside. Effortless on screen.',
  summary:
    'I build production web and mobile apps with React, React Native and TypeScript — fast, accessible and calm to use, however complex they are underneath.',
  location: 'Essen, Germany',
  availability: 'Open to remote / hybrid',
  email: 'riadhsouissi@gmx.de',
  github: 'https://github.com/Riadh180',
  cvHref: '/cv',
} as const

/** The tagline as it is set in the 3D statement scene, one entry per line. */
export const statementLines = ['Complex inside.', 'Effortless', 'on screen.'] as const

export const about = {
  body: '7.5+ years building production web and mobile apps across fintech, enterprise SaaS and logistics with React, React Native and TypeScript — and I understand the data behind the interface.',
  languages: ['English', 'German', 'French', 'Arabic'],
} as const

export const sections = [
  { id: 'signal', index: '00', label: 'Signal' },
  { id: 'approach', index: '01', label: 'Approach' },
  { id: 'form', index: '02', label: 'Form' },
  { id: 'work', index: '03', label: 'Work' },
  { id: 'system', index: '04', label: 'System' },
  { id: 'depth', index: '05', label: 'Depth' },
  { id: 'contact', index: '06', label: 'Contact' },
] as const

export type SectionId = (typeof sections)[number]['id']

/** The filter words in the Work UI: "FILTER WORK → REACT · REACT NATIVE · …". */
export const workFilters = ['React', 'React Native', 'Testing', 'Creative', 'Data'] as const
export type WorkFilter = (typeof workFilters)[number]

export type Job = {
  /** URL segment (/work/<slug>) and media folder (public/work/<slug>/). */
  slug: string
  company: string
  role: string
  years: string
  /** The card title: company · metric. */
  metric: string
  summary: string
  stack: string[]
  filters: WorkFilter[]
}

/** The stations, newest first. Metrics are the real ones from the CV, never invented. */
export const jobs: Job[] = [
  {
    slug: 'bliggit',
    company: 'Bliggit',
    role: 'Senior Software Developer',
    years: '2024–2026',
    metric: '>99% crash-free',
    summary:
      'Led the Treuewelt Wuppertal app (React Native / Expo) for Stadtsparkasse Wuppertal, used by tens of thousands of bank customers. Apple Pay & PayPal integration, ~30% faster screen loads, >99% crash-free sessions, weekly releases with zero rollbacks.',
    stack: ['React Native', 'Expo', 'TypeScript', 'Apple Pay', 'PayPal'],
    filters: ['React Native', 'React', 'Testing'],
  },
  {
    slug: 'kuehne-nagel',
    company: 'Kühne+Nagel',
    role: 'Senior Full Stack Developer',
    years: '2023–2024',
    metric: 'Cypress guidelines',
    summary:
      'myKN customer platform for one of the world’s largest logistics companies. Vue.js / TypeScript on the front end, Java / Spring behind it; authored the team’s Cypress testing guidelines.',
    stack: ['Vue.js', 'TypeScript', 'Cypress', 'Java', 'Spring'],
    filters: ['Testing'],
  },
  {
    slug: 'adesso',
    company: 'Adesso SE',
    role: 'Senior Software Developer',
    years: '2023',
    metric: '−40% coupling',
    summary:
      'Angular + Electron architecture: found 10+ security vulnerabilities, cut module coupling by ~40% and fixed UI lag.',
    stack: ['Angular', 'Electron', 'TypeScript'],
    filters: ['Testing'],
  },
  {
    slug: 'eon',
    company: 'RRI at E.ON',
    role: 'Software Developer',
    years: '2020–2022',
    metric: '>80% test coverage',
    summary:
      'Enterprise React / TypeScript device-management platform. Co-authored the reference architecture for a 15+ person team, kept test coverage above 80% and mentored juniors.',
    stack: ['React', 'TypeScript', 'Jest', 'React Testing Library'],
    filters: ['React', 'Testing'],
  },
  {
    slug: 'licht-und-schatten',
    company: 'Licht & Schatten',
    role: 'Fullstack React / Node.js',
    years: '2018–2020',
    metric: 'MERN end to end',
    summary:
      'MERN web and mobile apps built end to end, including a data-collection platform for ad campaigns.',
    stack: ['React', 'React Native', 'Node.js', 'MongoDB', 'Express'],
    filters: ['React', 'React Native', 'Data'],
  },
  {
    slug: 'freelance',
    company: 'Freelance',
    role: 'Creative Frontend',
    years: '2017–2018',
    metric: 'This site',
    summary:
      'Three.js, WebGL / GLSL shaders and GSAP: a 3D product portfolio with custom interactions. This site is the proof I still do this at the highest level: real-time glass, GPU particles and a scroll-driven camera, built with React Three Fiber.',
    stack: ['Three.js', 'WebGL', 'GLSL', 'GSAP', 'React Three Fiber'],
    filters: ['Creative', 'React'],
  },
]
