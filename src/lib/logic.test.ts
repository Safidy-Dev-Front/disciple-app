import { describe, expect, test } from 'vitest';

import { reducer } from '../state/reducer';
import { MemoryAdapter } from '../storage/adapter';
import { createRepository } from '../storage/repository';
import { createEmptyData, parseAppData } from '../storage/schema';
import type { Session } from '../types';

import { buildSeedData } from './seed';
import { computeStreak, dayStatus, ratioOf, totalsByDay, totalsByProject } from './stats';
import { addDays, formatHMS, weekStart } from './time';
import { elapsedMs, guidedPosition } from './timer';

const MIN = 60_000;

const session = (date: string, minutes: number, extra: Partial<Session> = {}): Session => ({
  id: `${date}-${minutes}-${Math.random()}`,
  date,
  startTime: '09:00',
  durationSec: minutes * 60,
  categoryId: 'reproduction',
  projectId: null,
  source: 'live',
  adjusted: false,
  label: '',
  note: '',
  createdAt: 0,
  ...extra,
});

describe('chronomètre', () => {
  test('le temps est calculé depuis les timestamps (onglet en veille)', () => {
    let s = reducer(createEmptyData(), { type: 'timer/start', now: 1_000 });
    // 2 h passent sans aucun tick
    expect(elapsedMs(s.timer, 1_000 + 120 * MIN)).toBe(120 * MIN);
    s = reducer(s, { type: 'timer/pause', now: 1_000 + 30 * MIN });
    expect(elapsedMs(s.timer, 1_000 + 999 * MIN)).toBe(30 * MIN);
    s = reducer(s, { type: 'timer/resume', now: 5_000_000 });
    expect(elapsedMs(s.timer, 5_000_000 + 10 * MIN)).toBe(40 * MIN);
  });

  test('le chrono survit à un rechargement (persistance)', () => {
    const repo = createRepository(new MemoryAdapter());
    const s = reducer(createEmptyData(), { type: 'timer/start', now: 1_000 });
    repo.save(s);
    const reloaded = repo.load();
    expect(reloaded.timer.status).toBe('running');
    expect(elapsedMs(reloaded.timer, 1_000 + 45 * MIN)).toBe(45 * MIN);
  });

  test("enregistrer crée une session 'live' et remet le chrono à zéro", () => {
    const start = new Date(2027, 0, 4, 8, 0).getTime();
    let s = reducer(createEmptyData(), { type: 'timer/configure', patch: { projectId: 'beyond-space' } });
    s = reducer(s, { type: 'timer/start', now: start });
    s = reducer(s, { type: 'timer/save', now: start + 90 * MIN, id: 'x', note: '  next  ' });
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]).toMatchObject({
      date: '2027-01-04',
      startTime: '08:00',
      durationSec: 5400,
      source: 'live',
      note: 'next',
    });
    expect(s.timer.status).toBe('idle');
    expect(s.projects['beyond-space'].status).toBe('in_progress');
  });

  test('refuse une session de moins d’une minute', () => {
    let s = reducer(createEmptyData(), { type: 'timer/start', now: 0 });
    s = reducer(s, { type: 'timer/save', now: 30_000, id: 'x', note: '' });
    expect(s.sessions).toHaveLength(0);
  });
});

describe('session guidée 75/15/75/15', () => {
  test('positions des blocs', () => {
    expect(guidedPosition(0)).toMatchObject({ index: 0, completed: 0 });
    expect(guidedPosition(75 * MIN)).toMatchObject({ index: 1, completed: 1 });
    expect(guidedPosition(100 * MIN)).toMatchObject({ index: 2, blockElapsedMs: 10 * MIN });
    expect(guidedPosition(180 * MIN)).toMatchObject({ index: 4, completed: 4 });
  });
});

describe('statuts et stats', () => {
  const today = '2027-01-06'; // mercredi
  test('statuts quotidiens', () => {
    expect(dayStatus(179 * 60, today, today, false)).toBe('in_progress');
    expect(dayStatus(180 * 60, today, today, false)).toBe('validated');
    expect(dayStatus(200 * 60, today, today, false)).toBe('sprint');
    expect(dayStatus(0, '2027-01-05', today, false)).toBe('missed');
    expect(dayStatus(0, '2027-01-03', today, false)).toBe('none'); // dimanche
  });

  test('série : le week-end ne casse pas la série, un jour ouvré manqué si', () => {
    const sessions = ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-04', '2027-01-05'].map((d) => session(d, 180));
    const map = totalsByDay(sessions);
    expect(computeStreak(map, today, false)).toEqual({ current: 5, best: 5 });
    const broken = totalsByDay(sessions.filter((s) => s.date !== '2027-01-01'));
    expect(computeStreak(broken, today, false).current).toBe(2);
  });

  test('ratio théorie / pratique', () => {
    const r = ratioOf([session(today, 30, { categoryId: 'study' }), session(today, 70)]);
    expect(r.theoryShare).toBeCloseTo(0.3);
  });

  test('cumul par projet', () => {
    const t = totalsByProject([
      session(today, 60, { projectId: 'type-in-motion' }),
      session(today, 30, { projectId: 'type-in-motion' }),
    ]);
    expect(t.get('type-in-motion')).toEqual({ sec: 5400, count: 2 });
  });
});

describe('outils', () => {
  test('formatage et dates', () => {
    expect(formatHMS(180 * MIN)).toBe('03:00:00');
    expect(weekStart('2027-01-06')).toBe('2027-01-04');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  test('les données corrompues ne cassent pas le chargement', () => {
    const data = parseAppData({
      sessions: [{ id: 1 }, session('2027-01-04', 10)],
      timer: { status: 'running' },
      projects: 'x',
    });
    expect(data.sessions).toHaveLength(1);
    expect(data.timer.status).toBe('paused');
    expect(data.projects['liquid-memories'].status).toBe('upcoming');
  });

  test('les données de test sont valides et déterministes', () => {
    const now = new Date(2027, 0, 6, 12).getTime();
    const a = buildSeedData(now);
    expect(parseAppData(JSON.parse(JSON.stringify(a))).sessions).toHaveLength(a.sessions.length);
    expect(buildSeedData(now).sessions.map((s) => s.durationSec)).toEqual(a.sessions.map((s) => s.durationSec));
  });
});
