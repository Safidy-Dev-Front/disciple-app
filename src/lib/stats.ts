import { CATEGORY_BY_ID, DAILY_GOAL_MIN, QUARTERS } from '../data/program';
import type { DayStatus, ProjectId, Quarter, Session } from '../types';

import { addDays, weekdayIndex, weekStart } from './time';

export const DAILY_GOAL_SEC = DAILY_GOAL_MIN * 60;
/** Au-delà de 180 minutes pleines : statut Sprint (+). */
export const SPRINT_THRESHOLD_SEC = (DAILY_GOAL_MIN + 1) * 60;

export interface DayTotals {
  total: number;
  live: number;
  manual: number;
  theory: number;
  practice: number;
  count: number;
}

const emptyTotals = (): DayTotals => ({ total: 0, live: 0, manual: 0, theory: 0, practice: 0, count: 0 });

export function totalsByDay(sessions: Session[]): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>();
  for (const s of sessions) {
    let t = map.get(s.date);
    if (!t) {
      t = emptyTotals();
      map.set(s.date, t);
    }
    t.total += s.durationSec;
    t.count += 1;
    if (s.source === 'manual') t.manual += s.durationSec;
    else t.live += s.durationSec;
    if (CATEGORY_BY_ID[s.categoryId].kind === 'THEORY') t.theory += s.durationSec;
    else t.practice += s.durationSec;
  }
  return map;
}

export function getDay(map: Map<string, DayTotals>, key: string): DayTotals {
  return map.get(key) ?? emptyTotals();
}

export function isWorkday(key: string, sprintWeek: boolean): boolean {
  const i = weekdayIndex(key);
  return i < 5 || (sprintWeek && i === 5);
}

export function dayStatus(totalSec: number, key: string, today: string, sprintWeek: boolean): DayStatus {
  if (totalSec >= SPRINT_THRESHOLD_SEC) return 'sprint';
  if (totalSec >= DAILY_GOAL_SEC) return 'validated';
  if (key === today) return 'in_progress';
  if (key > today) return 'none';
  return totalSec > 0 || isWorkday(key, sprintWeek) ? 'missed' : 'none';
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  none: 'Repos',
  in_progress: 'En cours',
  validated: '3h validées',
  sprint: 'Sprint (+)',
  missed: 'Non atteint',
};

export const isValidated = (status: DayStatus): boolean => status === 'validated' || status === 'sprint';

export interface Streak {
  current: number;
  best: number;
}

/**
 * Série de jours consécutifs à 3 h. Les jours non travaillés (week-end, ou
 * dimanche en semaine sprint) ne cassent pas la série ; validés, ils comptent.
 * Aujourd'hui non encore validé ne casse pas la série non plus.
 */
export function computeStreak(map: Map<string, DayTotals>, today: string, sprintWeek: boolean): Streak {
  const validatedDay = (k: string) => getDay(map, k).total >= DAILY_GOAL_SEC;

  let current = 0;
  let cursor = today;
  if (!validatedDay(today)) cursor = addDays(today, -1);
  const earliest = [...map.keys()].sort()[0] ?? today;
  while (cursor >= earliest) {
    if (validatedDay(cursor)) current += 1;
    else if (isWorkday(cursor, sprintWeek)) break;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  for (let k = earliest; k <= today; k = addDays(k, 1)) {
    if (validatedDay(k)) {
      run += 1;
      best = Math.max(best, run);
    } else if (isWorkday(k, sprintWeek) && k !== today) {
      run = 0;
    }
  }
  return { current, best: Math.max(best, current) };
}

export interface WeekDay {
  key: string;
  totals: DayTotals;
  status: DayStatus;
}

export function weekDays(map: Map<string, DayTotals>, today: string, sprintWeek: boolean): WeekDay[] {
  const start = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const totals = getDay(map, key);
    return { key, totals, status: dayStatus(totals.total, key, today, sprintWeek) };
  });
}

export function lastNDays(map: Map<string, DayTotals>, today: string, n: number, sprintWeek: boolean): WeekDay[] {
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - (n - 1));
    const totals = getDay(map, key);
    return { key, totals, status: dayStatus(totals.total, key, today, sprintWeek) };
  });
}

export interface Ratio {
  theory: number;
  practice: number;
  total: number;
  /** Part de théorie 0–1 (0 si aucune donnée). */
  theoryShare: number;
}

export function ratioOf(sessions: Session[]): Ratio {
  let theory = 0;
  let practice = 0;
  for (const s of sessions) {
    if (CATEGORY_BY_ID[s.categoryId].kind === 'THEORY') theory += s.durationSec;
    else practice += s.durationSec;
  }
  const total = theory + practice;
  return { theory, practice, total, theoryShare: total ? theory / total : 0 };
}

export interface ProjectTotals {
  sec: number;
  count: number;
}

export function totalsByProject(sessions: Session[]): Map<ProjectId, ProjectTotals> {
  const map = new Map<ProjectId, ProjectTotals>();
  for (const s of sessions) {
    if (!s.projectId) continue;
    const t = map.get(s.projectId) ?? { sec: 0, count: 0 };
    t.sec += s.durationSec;
    t.count += 1;
    map.set(s.projectId, t);
  }
  return map;
}

export function quarterTotalSec(sessions: Session[], q: Quarter): number {
  return sessions.reduce((acc, s) => (s.date >= q.start && s.date <= q.end ? acc + s.durationSec : acc), 0);
}

export function currentQuarter(today: string): Quarter | null {
  return QUARTERS.find((q) => today >= q.start && today <= q.end) ?? null;
}
