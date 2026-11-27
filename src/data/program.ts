import type { Category, CategoryId, ProjectId, ProjectMeta, ProjectState, Quarter } from '../types';

export const DAILY_GOAL_MIN = 180;
export const WEEK_GOAL_H = 15;
export const SPRINT_WEEK_GOAL_H = 18;
export const THEORY_TARGET = 0.3;

export const CATEGORIES: Category[] = [
  { id: 'study', label: 'Étude technique', kind: 'THEORY', hint: 'Three.js, GLSL, WebGPU/TSL, GSAP, docs' },
  {
    id: 'reproduction',
    label: "Reproduction d'effets",
    kind: 'PRACTICE',
    hint: 'Awwwards, Codrops, shaders/animations',
  },
  { id: 'design', label: 'Design, DA & 3D', kind: 'PRACTICE', hint: 'Figma, Blender, direction artistique' },
  { id: 'experiment', label: 'Expérimentation personnelle', kind: 'PRACTICE', hint: 'Code créatif libre, prototypes' },
  {
    id: 'publish',
    label: 'Optimisation, publication & doc',
    kind: 'PRACTICE',
    hint: 'Perf, responsive, case studies, WIP',
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const PROJECTS: ProjectMeta[] = [
  { id: 'liquid-memories', index: 1, name: 'Liquid Memories', stack: ['GLSL', 'WebGL', 'GSAP'] },
  { id: 'type-in-motion', index: 2, name: 'Type in Motion', stack: ['Three.js', 'GSAP', 'Typography'] },
  { id: 'digital-organism', index: 3, name: 'Digital Organism', stack: ['WebGPU', 'Physics', 'Particles'] },
  { id: 'beyond-space', index: 4, name: 'Beyond Space', stack: ['Three.js', 'Blender', 'ScrollTrigger'] },
  {
    id: 'person-in-mirror',
    index: 5,
    name: 'The Person in the Mirror',
    stack: ['Shaders', 'Reflection', 'Interaction'],
  },
];

export const PROJECT_BY_ID: Record<ProjectId, ProjectMeta> = Object.fromEntries(
  PROJECTS.map((p) => [p.id, p]),
) as Record<ProjectId, ProjectMeta>;

export const DEFAULT_PROJECT_STATE: Record<ProjectId, ProjectState> = Object.fromEntries(
  PROJECTS.map((p) => [p.id, { status: 'upcoming', progress: 0 }]),
) as Record<ProjectId, ProjectState>;

export const PROJECT_STATUS_LABEL: Record<ProjectState['status'], string> = {
  upcoming: 'À venir',
  in_progress: 'En cours',
  done: 'Terminé',
};

export const QUARTERS: Quarter[] = [
  { id: 'Q1', title: 'Advanced Motion & Creative UI', months: 'Jan – Mar', start: '2027-01-01', end: '2027-03-31' },
  { id: 'Q2', title: 'Advanced Three.js & Shaders', months: 'Avr – Juin', start: '2027-04-01', end: '2027-06-30' },
  { id: 'Q3', title: 'Interactive Experiences', months: 'Juil – Sept', start: '2027-07-01', end: '2027-09-30' },
  { id: 'Q4', title: 'Production & Positioning', months: 'Oct – Déc', start: '2027-10-01', end: '2027-12-31' },
];

export interface GuidedBlock {
  key: string;
  title: string;
  subtitle: string;
  minutes: number;
  kind: 'work' | 'break' | 'close';
}

/** Session guidée de 3 h : 75 / 15 / 75 / 15. */
export const GUIDED_BLOCKS: GuidedBlock[] = [
  { key: 'dw1', title: 'Deep Work #1', subtitle: 'Concentration totale', minutes: 75, kind: 'work' },
  { key: 'break', title: 'Déconnexion écran', subtitle: 'Lève-toi, regarde loin', minutes: 15, kind: 'break' },
  { key: 'dw2', title: 'Deep Work #2', subtitle: 'Deuxième bloc profond', minutes: 75, kind: 'work' },
  {
    key: 'close',
    title: 'Clôture',
    subtitle: 'Commit Git, capture & prochaine micro-tâche',
    minutes: 15,
    kind: 'close',
  },
];

export const MANUAL_SESSION_LABEL = 'Session hors-ligne / rattrapage';
