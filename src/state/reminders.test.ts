import { describe, expect, test } from 'vitest';

import { createEmptyData, parseAppData } from '../storage/schema';
import type { AppData } from '../types';

import { reducer } from './reducer';
import { checkReminders } from './reminders';

const MIN = 60_000;
// Mercredi 6 janvier 2027, 10:00 (heure locale)
const T0 = new Date(2027, 0, 6, 10, 0).getTime();

const run = (data: AppData, now: number) => {
  const r = checkReminders(data, now);
  const next: AppData = {
    ...data,
    timer: { ...data.timer, ...r.timerPatch },
    notified: { ...data.notified, ...r.notifiedPatch },
  };
  return { kinds: r.events.map((e) => e.kind), next };
};

const started = (patch: Partial<AppData['timer']> = {}): AppData => {
  const d = reducer(createEmptyData(), { type: 'timer/configure', patch });
  return reducer({ ...d, settings: { ...d.settings, dailyReminderHour: null } }, { type: 'timer/start', now: T0 });
};

describe('moteur de rappels', () => {
  test('fin de bloc guidé : une seule alerte par bloc, même après une longue veille', () => {
    const d = started({ guided: true });
    expect(run(d, T0 + 74 * MIN).kinds).toEqual([]);
    const a = run(d, T0 + 76 * MIN);
    expect(a.kinds).toEqual(['block']);
    expect(run(a.next, T0 + 77 * MIN).kinds).toEqual([]);
    // Réveil après 2 h : blocs 2 et 3 terminés → une seule alerte
    const b = run(a.next, T0 + 170 * MIN);
    expect(b.kinds).toEqual(['block']);
    expect(b.next.timer.blocksNotified).toBe(3);
  });

  test('minuteur du mode libre écoulé', () => {
    const d = started({ targetMin: 50 });
    expect(run(d, T0 + 49 * MIN).kinds).toEqual([]);
    const a = run(d, T0 + 50 * MIN);
    expect(a.kinds).toEqual(['target']);
    expect(run(a.next, T0 + 60 * MIN).kinds).toEqual([]);
  });

  test('3h validées : une fois par jour, sessions enregistrées incluses', () => {
    let d = started();
    d = {
      ...d,
      sessions: parseAppData({
        sessions: [{ id: 'a', date: '2027-01-06', durationSec: 150 * 60, categoryId: 'study', startTime: '07:00' }],
      }).sessions,
    };
    expect(run(d, T0 + 29 * MIN).kinds).toEqual([]);
    const a = run(d, T0 + 30 * MIN);
    expect(a.kinds).toEqual(['goal']);
    expect(run(a.next, T0 + 40 * MIN).kinds).toEqual([]);
  });

  test('pause trop longue', () => {
    let d = started();
    d = reducer(d, { type: 'timer/pause', now: T0 + 20 * MIN });
    expect(run(d, T0 + 34 * MIN).kinds).toEqual([]);
    const a = run(d, T0 + 35 * MIN);
    expect(a.kinds).toEqual(['pause']);
    expect(run(a.next, T0 + 60 * MIN).kinds).toEqual([]);
    // Reprendre puis re-pauser réarme le rappel
    let e = reducer(a.next, { type: 'timer/resume', now: T0 + 61 * MIN });
    e = reducer(e, { type: 'timer/pause', now: T0 + 62 * MIN });
    expect(run(e, T0 + 77 * MIN).kinds).toEqual(['pause']);
  });

  test('rappel du soir : jour ouvré non validé, chrono arrêté, une fois', () => {
    const d = createEmptyData(); // rappel par défaut à 19 h
    const evening = new Date(2027, 0, 6, 19, 5).getTime();
    expect(run(d, new Date(2027, 0, 6, 18, 0).getTime()).kinds).toEqual([]);
    const a = run(d, evening);
    expect(a.kinds).toEqual(['daily']);
    expect(run(a.next, evening + 30 * MIN).kinds).toEqual([]);
    // Dimanche : pas de rappel
    expect(run(d, new Date(2027, 0, 10, 19, 5).getTime()).kinds).toEqual([]);
  });

  test('les anciennes données sans réglages de notification restent valides', () => {
    const old = parseAppData({ settings: { sprintWeek: true, sound: false }, timer: { status: 'idle' } });
    expect(old.settings).toMatchObject({ sprintWeek: true, notifications: false, dailyReminderHour: 19 });
    expect(old.notified).toEqual({ goalFor: null, dailyReminderFor: null });
    expect(parseAppData({ settings: { dailyReminderHour: null } }).settings.dailyReminderHour).toBeNull();
  });
});
