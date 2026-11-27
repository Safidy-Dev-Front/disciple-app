import { GUIDED_BLOCKS } from '../data/program';
import { DAILY_GOAL_SEC, isWorkday } from '../lib/stats';
import { dayKey, formatDuration, formatHMS, todayKey } from '../lib/time';
import { elapsedMs, guidedPosition } from '../lib/timer';
import type { AppData, NotifiedState, TimerState } from '../types';

export type ReminderKind = 'block' | 'target' | 'goal' | 'pause' | 'daily';

export interface ReminderEvent {
  kind: ReminderKind;
  title: string;
  body: string;
  /** Même tag = remplace la notification système précédente. */
  tag: string;
  sticky: boolean;
}

export interface ReminderCheck {
  events: ReminderEvent[];
  timerPatch: Partial<TimerState>;
  notifiedPatch: Partial<NotifiedState>;
}

/** Temps du jour : sessions enregistrées + chrono en cours (s'il a démarré aujourd'hui). */
export function todayTotalMs(data: AppData, now: number): number {
  const today = todayKey(now);
  const savedSec = data.sessions.reduce((acc, s) => (s.date === today ? acc + s.durationSec : acc), 0);
  const { timer } = data;
  const counts =
    timer.status !== 'idle' && timer.sessionStartedAt !== null && dayKey(new Date(timer.sessionStartedAt)) === today;
  return savedSec * 1000 + (counts ? elapsedMs(timer, now) : 0);
}

/**
 * Moteur de rappels, pur et testable : à partir de l'état et de l'heure, renvoie
 * les notifications à émettre et les drapeaux à mémoriser pour ne pas les répéter.
 * Chaque rappel n'est émis qu'une fois, même si l'app a dormi longtemps.
 */
export function checkReminders(data: AppData, now: number): ReminderCheck {
  const { timer, settings, notified } = data;
  const events: ReminderEvent[] = [];
  const timerPatch: Partial<TimerState> = {};
  const notifiedPatch: Partial<NotifiedState> = {};
  const today = todayKey(now);
  const elapsed = elapsedMs(timer, now);
  const running = timer.status === 'running';
  const totalMs = todayTotalMs(data, now);
  const goalMs = DAILY_GOAL_SEC * 1000;

  // 1. Fin d'un bloc de la session guidée 75 / 15 / 75 / 15.
  if (running && timer.guided) {
    const { completed } = guidedPosition(elapsed);
    if (completed > timer.blocksNotified) {
      const ended = GUIDED_BLOCKS[completed - 1];
      const next = GUIDED_BLOCKS[completed];
      events.push({
        kind: 'block',
        title: next ? `${ended.title} terminé` : 'Session guidée terminée',
        body: next
          ? `Place à : ${next.title} (${next.minutes} min). ${next.subtitle}.`
          : 'Les 4 blocs sont faits. Enregistre ta session et note la prochaine micro-tâche.',
        tag: 'block',
        sticky: true,
      });
      timerPatch.blocksNotified = completed;
    }
  }

  // 2. Minuteur du mode libre écoulé.
  if (running && !timer.guided && timer.targetMin !== null && !timer.targetNotified) {
    if (elapsed >= timer.targetMin * 60_000) {
      events.push({
        kind: 'target',
        title: 'Minuteur écoulé',
        body: `${formatDuration(timer.targetMin * 60)} de travail. Le chrono continue : pause ou enregistre ta session.`,
        tag: 'target',
        sticky: true,
      });
      timerPatch.targetNotified = true;
    }
  }

  // 3. Objectif des 3 h atteint pendant que le chrono tourne.
  if (running && totalMs >= goalMs && notified.goalFor !== today) {
    events.push({
      kind: 'goal',
      title: '3h validées ✓',
      body: "L'objectif du jour est atteint. Tout ce qui suit compte en Sprint (+).",
      tag: 'goal',
      sticky: false,
    });
    notifiedPatch.goalFor = today;
  }

  // 4. Pause qui s'éternise.
  if (
    timer.status === 'paused' &&
    settings.pauseReminderMin !== null &&
    timer.pausedAt !== null &&
    !timer.pauseReminded &&
    now - timer.pausedAt >= settings.pauseReminderMin * 60_000
  ) {
    events.push({
      kind: 'pause',
      title: 'Toujours en pause',
      body: `En pause depuis ${settings.pauseReminderMin} min (session à ${formatHMS(elapsed)}). On reprend ?`,
      tag: 'pause',
      sticky: false,
    });
    timerPatch.pauseReminded = true;
  }

  // 5. Rappel quotidien : passé l'heure choisie, journée de travail non validée.
  if (
    settings.dailyReminderHour !== null &&
    new Date(now).getHours() >= settings.dailyReminderHour &&
    notified.dailyReminderFor !== today &&
    !running &&
    totalMs < goalMs &&
    isWorkday(today, settings.sprintWeek)
  ) {
    events.push({
      kind: 'daily',
      title: 'Rappel : 3h du jour',
      body: `Il te reste ${formatHMS(goalMs - totalMs)} pour valider la journée.`,
      tag: 'daily',
      sticky: false,
    });
    notifiedPatch.dailyReminderFor = today;
  }

  return { events, timerPatch, notifiedPatch };
}
