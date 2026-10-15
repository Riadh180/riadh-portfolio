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
  linkedin: 'https://www.linkedin.com/in/riadh-souissi/',
  cvHref: '/cv',
} as const

/** The tagline as it is set in the 3D statement scene, one entry per line. */
export const statementLines = ['Complex inside.', 'Effortless', 'on screen.'] as const

/** CV-only facts (the /cv page and its PDF). */
export const cv = {
  languages: [
    { name: 'English', level: 'fluent (C1/C2)' },
    { name: 'German', level: 'advanced (B2/C1)' },
    { name: 'French', level: 'native / fluent' },
    { name: 'Arabic', level: 'native' },
  ],
  education: [
    {
      title: 'B.Sc. Computer Science — Information Systems',
      place: 'Faculty of Sciences, Monastir, Tunisia',
      dates: '2014',
    },
  ],
  /** Skills beyond the graph, grouped. */
  moreSkills: [
    { label: 'State & data', skills: ['TanStack Query', 'Jotai', 'Recoil', 'GraphQL', 'REST'] },
    {
      label: 'React performance',
      skills: ['useTransition', 'react-virtualized', 'Webpack Bundle Analyzer'],
    },
    { label: 'Back end', skills: ['Node.js', 'Java', 'Spring', 'MongoDB'] },
    { label: 'Design & UI', skills: ['Figma', 'Zeplin', 'Atomic Design'] },
    { label: 'Tooling', skills: ['Docker', 'NX Monorepo', 'Vercel', 'Jira', 'Confluence'] },
  ],
} as const

export const about = {
  body: '7.5+ years building production web and mobile apps across fintech, enterprise SaaS and logistics with React, React Native and TypeScript — and I understand the data behind the interface.',
  languages: ['English', 'German', 'French', 'Arabic'],
} as const

export const sections = [
  { id: 'signal', index: '00', label: 'Signal' },
  { id: 'approach', index: '01', label: 'Approach' },
  { id: 'work', index: '02', label: 'Work' },
  { id: 'system', index: '03', label: 'System' },
  /** Depth lives inside System: the camera follows the data branch down into it. */
  { id: 'depth', index: '03', label: 'Depth' },
  { id: 'contact', index: '04', label: 'Contact' },
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
  /** Exact dates and place, for the CV. */
  dates: string
  location: string
  /** Extra detail lines for the CV (from the CV itself). */
  details?: string[]
  /** The card's big title and small line, when not metric and company. */
  cardTitle?: string
  cardSubtitle?: string
  /** A shorter summary for the CV, where the site's wording doesn't fit. */
  cvSummary?: string
  /** More images shown in the opened card's details (public/work/<slug>/…). */
  gallery?: { src: string; alt: string }[]
  /** A public repository, linked from the details. */
  repo?: string
  /** A cover with its own file name in public/work/<slug>/ (otherwise cover.webp|jpg|png). */
  coverFile?: string
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
    dates: '07/2024–01/2026',
    location: 'Wuppertal',
    details: [
      'Apple Pay & PayPal integration via Payone',
      'Lazy loading and navigation improvements: ~30% faster screen loads',
      'Crash monitoring with Sentry (>99% crash-free sessions)',
      'CI/CD with GitLab and EAS: weekly releases, zero rollbacks',
    ],
    gallery: [{ src: '/work/bliggit/login.png', alt: 'Treuewelt Wuppertal app: login screen' }],
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
    dates: '11/2023–04/2024',
    location: 'Hamburg',
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
    dates: '01/2023–07/2023',
    location: 'Essen',
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
    dates: '02/2020–12/2022',
    location: 'Essen',
    details: [
      'Built 12+ form-table components',
      'End-to-end tests with Cypress and Robot Framework; unit tests with Jest and React Testing Library',
    ],
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
    dates: '07/2018–01/2020',
    location: 'Tunis',
    details: [
      'Custom React component library',
      'Native adaptations for iOS and Android',
      'MongoDB aggregation pipelines and REST APIs',
    ],
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
    dates: '07/2017–06/2018',
    location: 'Tunis',
    cvSummary:
      'Three.js, WebGL / GLSL shaders and GSAP: a 3D product portfolio with custom interactions.',
    metric: 'This site',
    summary:
      'Three.js, WebGL / GLSL shaders and GSAP: a 3D product portfolio with custom interactions. This site is the proof I still do this at the highest level: real-time glass, GPU particles and a scroll-driven camera, built with React Three Fiber.',
    stack: ['Three.js', 'WebGL', 'GLSL', 'GSAP', 'React Three Fiber'],
    filters: ['Creative', 'React'],
  },
]

export type Skill = {
  name: string
  /** Jobs (slugs) where the CV shows this skill in use; empty if the CV doesn't say. */
  usedAt: string[]
  /** Where it was learned or used, when that isn't a job. */
  note?: string
}

export type SkillBranch = {
  id: string
  label: string
  skills: Skill[]
  /** The data branch: visually secondary, hanging below the graph. */
  secondary?: boolean
}

/** The skills graph: React / TypeScript at the centre, branches around it. */
export const skillGraph: { core: Skill; branches: SkillBranch[] } = {
  core: {
    name: 'React / TypeScript',
    usedAt: ['bliggit', 'kuehne-nagel', 'adesso', 'eon', 'licht-und-schatten', 'freelance'],
  },
  branches: [
    {
      id: 'mobile',
      label: 'Mobile',
      skills: [
        { name: 'React Native', usedAt: ['bliggit', 'licht-und-schatten'] },
        { name: 'Expo', usedAt: ['bliggit'] },
        { name: 'EAS', usedAt: ['bliggit'] },
      ],
    },
    {
      id: 'frontend',
      label: 'Frontend',
      skills: [
        { name: 'Next.js', usedAt: [] },
        { name: 'Vue.js', usedAt: ['kuehne-nagel'] },
        { name: 'Angular', usedAt: ['adesso'] },
        { name: 'Electron', usedAt: ['adesso'] },
      ],
    },
    {
      id: 'testing',
      label: 'Testing & quality',
      skills: [
        { name: 'Cypress', usedAt: ['kuehne-nagel'] },
        { name: 'Jest', usedAt: ['eon'] },
        { name: 'React Testing Library', usedAt: ['eon'] },
        { name: 'Sentry', usedAt: ['bliggit'] },
        { name: 'CI/CD', usedAt: ['bliggit'], note: 'GitLab CI/CD + EAS' },
        { name: 'Robot Framework', usedAt: ['eon'] },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      skills: [
        { name: 'Profiling', usedAt: ['bliggit', 'adesso'] },
        { name: 'Lazy loading', usedAt: ['bliggit'] },
        { name: 'React Profiler', usedAt: [] },
        { name: 'Suspense', usedAt: [] },
        { name: 'react-window', usedAt: [] },
        { name: 'Web Vitals', usedAt: [] },
        { name: 'Lighthouse', usedAt: [] },
      ],
    },
    {
      id: 'creative',
      label: 'Creative dev',
      skills: [
        { name: 'Three.js', usedAt: ['freelance'] },
        { name: 'WebGL / GLSL', usedAt: ['freelance'] },
        { name: 'GSAP', usedAt: ['freelance'] },
        { name: 'Motion', usedAt: [], note: 'Framer Motion' },
      ],
    },
    {
      id: 'data',
      label: 'Data engineering',
      secondary: true,
      skills: ['Python', 'SQL', 'Spark', 'Kafka', 'Airflow', 'dbt', 'AWS'].map((name) => ({
        name,
        usedAt: [],
        note: 'Data Engineering Programme (neue fische / SPICED, 04–08/2026)',
      })),
    },
  ],
}

/** Depth: the data engineering place, "beneath the interface". Data vocabulary lives here only. */
export const depth = {
  title: 'Beneath the interface',
  lead: 'I understand the data behind the interface: I design better APIs with it, talk to data teams in their language, and build data-heavy UIs with confidence.',
  programme: 'Data Engineering Programme · neue fische / SPICED · 04/2026–08/2026',
  details:
    '720 hours / 960 lessons · certified · incl. AWS Certified Data Engineer – Associate exam prep',
  stack: [
    'Python',
    'SQL',
    'Spark',
    'Kafka',
    'Airflow',
    'dbt',
    'Docker',
    'AWS (S3, Glue, Redshift, Lambda)',
  ],
} as const

/** The capstone project, shown as Depth's glass panel (cover: public/work/capstone/). */
export const capstone: Job = {
  slug: 'capstone',
  company: 'AI × Work',
  role: 'Data Engineering Programme · capstone',
  years: '2026',
  dates: '04/2026–08/2026',
  location: '',
  metric: 'Bronze → Gold',
  cardTitle: 'AI × Work',
  cardSubtitle: 'Capstone · Bronze → Gold',
  summary:
    'A cloud data pipeline (bronze → silver → gold) that measures how AI is changing software development and the German job market, served through a public dashboard.',
  stack: [
    'Python',
    'dbt',
    'PostgreSQL (Neon)',
    'Cloudflare R2',
    'Apache Airflow',
    'Docker',
    'Streamlit',
    'Plotly',
  ],
  repo: 'https://github.com/Riadh180/data-engineering-capstone',
  coverFile: 'aiwork_medallion.svg',
  filters: ['Data'],
}
