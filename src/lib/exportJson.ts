import type { AppData } from '../types';

import { todayKey } from './time';

export function exportFileName(now: number = Date.now()): string {
  return `discipline-2027-${todayKey(now)}.json`;
}

/** Télécharge les données en JSON (fonctionne hors-ligne : Blob local, aucun réseau). */
export function downloadJson(data: AppData): void {
  const payload = { exportedAt: new Date().toISOString(), app: 'Discipline 2027 — Creative Dev', ...data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
