import { GUIDED_BLOCKS } from '../data/program';
import type { TimerState } from '../types';

/** Temps écoulé exact, calculé depuis les timestamps (jamais en comptant des ticks). */
export function elapsedMs(timer: TimerState, now: number): number {
  if (timer.status === 'running' && timer.startedAt !== null) {
    return timer.accumulatedMs + Math.max(0, now - timer.startedAt);
  }
  return timer.accumulatedMs;
}

/** Fin cumulée de chaque bloc guidé, en ms : [75, 90, 165, 180] min. */
export const GUIDED_BOUNDARIES_MS: number[] = GUIDED_BLOCKS.reduce<number[]>((acc, b) => {
  const prev = acc.length ? acc[acc.length - 1] : 0;
  acc.push(prev + b.minutes * 60_000);
  return acc;
}, []);

export const GUIDED_TOTAL_MS = GUIDED_BOUNDARIES_MS[GUIDED_BOUNDARIES_MS.length - 1];

export interface GuidedPosition {
  /** Index du bloc courant (0–3), ou 4 si la session guidée est terminée. */
  index: number;
  /** Nombre de blocs terminés. */
  completed: number;
  blockElapsedMs: number;
  blockRemainingMs: number;
  blockDurationMs: number;
}

export function guidedPosition(elapsed: number): GuidedPosition {
  const completed = GUIDED_BOUNDARIES_MS.filter((b) => elapsed >= b).length;
  if (completed >= GUIDED_BLOCKS.length) {
    return { index: GUIDED_BLOCKS.length, completed, blockElapsedMs: 0, blockRemainingMs: 0, blockDurationMs: 0 };
  }
  const blockStart = completed === 0 ? 0 : GUIDED_BOUNDARIES_MS[completed - 1];
  const blockDurationMs = GUIDED_BLOCKS[completed].minutes * 60_000;
  const blockElapsedMs = elapsed - blockStart;
  return {
    index: completed,
    completed,
    blockElapsedMs,
    blockRemainingMs: blockDurationMs - blockElapsedMs,
    blockDurationMs,
  };
}
