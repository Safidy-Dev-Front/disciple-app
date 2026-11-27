import { dayKey, timeOfDay } from '../lib/time';
import { elapsedMs } from '../lib/timer';
import { DEFAULT_TIMER } from '../storage/schema';
import type { AppData, CategoryId, ProjectId, ProjectState, Session, Settings } from '../types';

export type Action =
  | { type: 'timer/start'; now: number }
  | { type: 'timer/pause'; now: number }
  | { type: 'timer/resume'; now: number }
  | { type: 'timer/discard' }
  | {
      type: 'timer/configure';
      patch: Partial<{ guided: boolean; categoryId: CategoryId; projectId: ProjectId | null; blocksNotified: number }>;
    }
  | { type: 'timer/save'; now: number; id: string; note: string }
  | { type: 'session/add'; session: Session }
  | { type: 'session/update'; session: Session }
  | { type: 'session/delete'; id: string }
  | { type: 'project/update'; id: ProjectId; patch: Partial<ProjectState> }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'data/replace'; data: AppData };

/** Une session sur un projet « À venir » le fait passer « En cours ». */
function touchProject(projects: AppData['projects'], id: ProjectId | null): AppData['projects'] {
  if (!id || projects[id].status !== 'upcoming') return projects;
  return { ...projects, [id]: { ...projects[id], status: 'in_progress' } };
}

const sortSessions = (sessions: Session[]): Session[] =>
  [...sessions].sort((a, b) =>
    a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date),
  );

/** Durée minimale enregistrable depuis le chrono. */
export const MIN_SESSION_SEC = 60;

export function reducer(state: AppData, action: Action): AppData {
  const { timer } = state;
  switch (action.type) {
    case 'timer/start':
      if (timer.status !== 'idle') return state;
      return {
        ...state,
        timer: {
          ...timer,
          status: 'running',
          startedAt: action.now,
          accumulatedMs: 0,
          sessionStartedAt: action.now,
          blocksNotified: 0,
        },
      };

    case 'timer/pause':
      if (timer.status !== 'running') return state;
      return {
        ...state,
        timer: { ...timer, status: 'paused', accumulatedMs: elapsedMs(timer, action.now), startedAt: null },
      };

    case 'timer/resume':
      if (timer.status !== 'paused') return state;
      return { ...state, timer: { ...timer, status: 'running', startedAt: action.now } };

    case 'timer/discard':
      return {
        ...state,
        timer: { ...DEFAULT_TIMER, guided: timer.guided, categoryId: timer.categoryId, projectId: timer.projectId },
      };

    case 'timer/configure':
      return { ...state, timer: { ...timer, ...action.patch } };

    case 'timer/save': {
      if (timer.status === 'idle') return state;
      const durationSec = Math.round(elapsedMs(timer, action.now) / 1000);
      if (durationSec < MIN_SESSION_SEC) return state;
      const started = new Date(timer.sessionStartedAt ?? action.now - durationSec * 1000);
      const session: Session = {
        id: action.id,
        date: dayKey(started),
        startTime: timeOfDay(started),
        durationSec,
        categoryId: timer.categoryId,
        projectId: timer.projectId,
        source: 'live',
        adjusted: false,
        label: timer.guided ? 'Session guidée 3h' : '',
        note: action.note.trim(),
        createdAt: action.now,
      };
      return {
        ...state,
        sessions: sortSessions([session, ...state.sessions]),
        projects: touchProject(state.projects, session.projectId),
        timer: { ...DEFAULT_TIMER, guided: timer.guided, categoryId: timer.categoryId, projectId: timer.projectId },
      };
    }

    case 'session/add':
      return {
        ...state,
        sessions: sortSessions([action.session, ...state.sessions]),
        projects: touchProject(state.projects, action.session.projectId),
      };

    case 'session/update':
      return {
        ...state,
        sessions: sortSessions(state.sessions.map((s) => (s.id === action.session.id ? action.session : s))),
        projects: touchProject(state.projects, action.session.projectId),
      };

    case 'session/delete':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };

    case 'project/update': {
      const current = state.projects[action.id];
      const next = { ...current, ...action.patch };
      next.progress = Math.min(100, Math.max(0, Math.round(next.progress)));
      return { ...state, projects: { ...state.projects, [action.id]: next } };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'data/replace':
      return { ...action.data, sessions: sortSessions(action.data.sessions) };

    default:
      return state;
  }
}
