import { CATEGORY_BY_ID, DEFAULT_PROJECT_STATE, PROJECT_BY_ID } from '../data/program';
import { isValidDayKey, isValidTime } from '../lib/time';
import type {
  AppData,
  CategoryId,
  NotifiedState,
  ProjectId,
  ProjectState,
  ProjectStatus,
  Session,
  Settings,
  TimerState,
} from '../types';

export const SCHEMA_VERSION = 1 as const;

export const DEFAULT_TIMER: TimerState = {
  status: 'idle',
  startedAt: null,
  accumulatedMs: 0,
  sessionStartedAt: null,
  guided: false,
  blocksNotified: 0,
  categoryId: 'study',
  projectId: null,
  targetMin: null,
  targetNotified: false,
  pausedAt: null,
  pauseReminded: false,
};

export const DEFAULT_SETTINGS: Settings = {
  sprintWeek: false,
  sound: true,
  notifications: false,
  dailyReminderHour: 19,
  pauseReminderMin: 15,
  autoMiniTimer: true,
};

export const DEFAULT_NOTIFIED: NotifiedState = { goalFor: null, dailyReminderFor: null };

export function createEmptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    sessions: [],
    projects: structuredClone(DEFAULT_PROJECT_STATE),
    timer: { ...DEFAULT_TIMER },
    settings: { ...DEFAULT_SETTINGS },
    notified: { ...DEFAULT_NOTIFIED },
  };
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

export const isCategoryId = (v: unknown): v is CategoryId => typeof v === 'string' && v in CATEGORY_BY_ID;
export const isProjectId = (v: unknown): v is ProjectId => typeof v === 'string' && v in PROJECT_BY_ID;
const isProjectStatus = (v: unknown): v is ProjectStatus => v === 'upcoming' || v === 'in_progress' || v === 'done';

function sanitizeSession(v: unknown): Session | null {
  if (!isObj(v)) return null;
  if (typeof v.id !== 'string' || !isValidDayKey(v.date) || !isCategoryId(v.categoryId)) return null;
  if (!isFiniteNum(v.durationSec) || v.durationSec <= 0) return null;
  return {
    id: v.id,
    date: v.date,
    startTime: isValidTime(v.startTime) ? v.startTime : '09:00',
    durationSec: Math.round(v.durationSec),
    categoryId: v.categoryId,
    projectId: isProjectId(v.projectId) ? v.projectId : null,
    source: v.source === 'manual' ? 'manual' : 'live',
    adjusted: v.adjusted === true,
    label: str(v.label),
    note: str(v.note),
    createdAt: isFiniteNum(v.createdAt) ? v.createdAt : Date.now(),
  };
}

function sanitizeProjects(v: unknown): Record<ProjectId, ProjectState> {
  const out = structuredClone(DEFAULT_PROJECT_STATE);
  if (!isObj(v)) return out;
  for (const id of Object.keys(out) as ProjectId[]) {
    const p = v[id];
    if (!isObj(p)) continue;
    out[id] = {
      status: isProjectStatus(p.status) ? p.status : 'upcoming',
      progress: isFiniteNum(p.progress) ? Math.min(100, Math.max(0, Math.round(p.progress))) : 0,
    };
  }
  return out;
}

function sanitizeTimer(v: unknown): TimerState {
  if (!isObj(v)) return { ...DEFAULT_TIMER };
  const status = v.status === 'running' || v.status === 'paused' ? v.status : 'idle';
  const startedAt = isFiniteNum(v.startedAt) ? v.startedAt : null;
  const timer: TimerState = {
    status,
    startedAt: status === 'running' ? startedAt : null,
    accumulatedMs: isFiniteNum(v.accumulatedMs) ? Math.max(0, v.accumulatedMs) : 0,
    sessionStartedAt: isFiniteNum(v.sessionStartedAt) ? v.sessionStartedAt : null,
    guided: v.guided === true,
    blocksNotified: isFiniteNum(v.blocksNotified) ? Math.min(4, Math.max(0, Math.floor(v.blocksNotified))) : 0,
    categoryId: isCategoryId(v.categoryId) ? v.categoryId : 'study',
    projectId: isProjectId(v.projectId) ? v.projectId : null,
    targetMin: isFiniteNum(v.targetMin) && v.targetMin > 0 ? Math.round(v.targetMin) : null,
    targetNotified: v.targetNotified === true,
    pausedAt: status === 'paused' && isFiniteNum(v.pausedAt) ? v.pausedAt : null,
    pauseReminded: v.pauseReminded === true,
  };
  // Un chrono « running » sans timestamp de départ est incohérent : on le met en pause.
  if (timer.status === 'running' && timer.startedAt === null) timer.status = 'paused';
  return timer;
}

function sanitizeSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  return {
    sprintWeek: v.sprintWeek === true,
    sound: v.sound !== false,
    notifications: v.notifications === true,
    dailyReminderHour: optionalInt(v.dailyReminderHour, DEFAULT_SETTINGS.dailyReminderHour, 0, 23),
    pauseReminderMin: optionalInt(v.pauseReminderMin, DEFAULT_SETTINGS.pauseReminderMin, 1, 240),
    autoMiniTimer: v.autoMiniTimer !== false,
  };
}

/** `null` explicite = désactivé ; absent ou invalide = valeur par défaut. */
function optionalInt(v: unknown, fallback: number | null, min: number, max: number): number | null {
  if (v === null) return null;
  return isFiniteNum(v) && v >= min && v <= max ? Math.round(v) : fallback;
}

function sanitizeNotified(v: unknown): NotifiedState {
  if (!isObj(v)) return { ...DEFAULT_NOTIFIED };
  return {
    goalFor: isValidDayKey(v.goalFor) ? v.goalFor : null,
    dailyReminderFor: isValidDayKey(v.dailyReminderFor) ? v.dailyReminderFor : null,
  };
}

/**
 * Valide et normalise des données inconnues (localStorage, import…).
 * Ne jette jamais : toute donnée corrompue est remplacée par une valeur par défaut.
 */
export function parseAppData(raw: unknown): AppData {
  if (!isObj(raw)) return createEmptyData();
  // Point d'entrée des futures migrations : `if (raw.version === 1) raw = migrateV1toV2(raw)`.
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map(sanitizeSession).filter((s): s is Session => s !== null)
    : [];
  return {
    version: SCHEMA_VERSION,
    sessions,
    projects: sanitizeProjects(raw.projects),
    timer: sanitizeTimer(raw.timer),
    settings: sanitizeSettings(raw.settings),
    notified: sanitizeNotified(raw.notified),
  };
}
