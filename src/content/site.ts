const taglineLines = ['Complex inside.', 'Effortless on screen.'] as const

export const profile = {
  name: 'Riadh Souissi',
  role: 'Senior React / React Native Developer',
  tagline: taglineLines.join(' '),
  taglineLines,
  summary:
    'I build production web and mobile apps with React, React Native and TypeScript — fast, accessible and calm to use, however complex they are underneath.',
  location: 'Essen, Germany',
  coordinates: '51.4556° N, 7.0116° E',
  availability: 'Open to remote / hybrid',
  email: 'riadhsouissi@gmx.de',
  github: 'https://github.com/Riadh180',
  cvHref: '/cv',
} as const

export const about = {
  years: '7.5+',
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
