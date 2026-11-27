/** Nature pédagogique d'une catégorie : sert au ratio 30 % théorie / 70 % pratique. */
export type CategoryKind = 'THEORY' | 'PRACTICE';

export type CategoryId = 'study' | 'reproduction' | 'design' | 'experiment' | 'publish';

export interface Category {
  id: CategoryId;
  label: string;
  kind: CategoryKind;
  hint: string;
}

export type ProjectId = 'liquid-memories' | 'type-in-motion' | 'digital-organism' | 'beyond-space' | 'person-in-mirror';

export type ProjectStatus = 'upcoming' | 'in_progress' | 'done';

export interface ProjectMeta {
  id: ProjectId;
  index: number;
  name: string;
  stack: string[];
}

/** Partie modifiable d'un projet (la partie statique vit dans data/program.ts). */
export interface ProjectState {
  status: ProjectStatus;
  /** Avancement 0–100. */
  progress: number;
}

export interface Quarter {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  months: string;
  /** Bornes incluses, format YYYY-MM-DD. */
  start: string;
  end: string;
}

/** `live` = chronométré en direct, `manual` = ajouté à la main (rattrapage, hors-ligne…). */
export type SessionSource = 'live' | 'manual';

export interface Session {
  id: string;
  /** Jour de rattachement (local), YYYY-MM-DD. */
  date: string;
  /** Heure de début locale, HH:MM. */
  startTime: string;
  durationSec: number;
  categoryId: CategoryId;
  projectId: ProjectId | null;
  source: SessionSource;
  /** Vrai si une session chronométrée a vu sa durée corrigée à la main. */
  adjusted: boolean;
  label: string;
  note: string;
  createdAt: number;
}

export type TimerStatus = 'idle' | 'running' | 'paused';

/**
 * Chronomètre basé sur des timestamps : le temps écoulé vaut
 * `accumulatedMs + (now - startedAt)` quand il tourne. Il reste donc exact
 * même si l'onglet dort en arrière-plan ou si la page est rechargée.
 */
export interface TimerState {
  status: TimerStatus;
  /** Début du segment en cours (ms epoch), null si en pause / arrêté. */
  startedAt: number | null;
  accumulatedMs: number;
  /** Premier démarrage de la session (ms epoch), pour dater la session. */
  sessionStartedAt: number | null;
  guided: boolean;
  /** Nombre de blocs guidés déjà signalés (0–4). */
  blocksNotified: number;
  categoryId: CategoryId;
  projectId: ProjectId | null;
}

export interface Settings {
  /** Semaine sprint : 6 jours / 18 h au lieu de 5 jours / 15 h. */
  sprintWeek: boolean;
  sound: boolean;
}

export interface AppData {
  version: 1;
  sessions: Session[];
  projects: Record<ProjectId, ProjectState>;
  timer: TimerState;
  settings: Settings;
}

export type DayStatus = 'none' | 'in_progress' | 'validated' | 'sprint' | 'missed';
