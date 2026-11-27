import { DEFAULT_PROJECT_STATE, MANUAL_SESSION_LABEL } from '../data/program';
import { createEmptyData } from '../storage/schema';
import type { AppData, CategoryId, ProjectId, Session } from '../types';

import { addDays, todayKey, weekdayIndex } from './time';

/** PRNG déterministe (mulberry32) : les données de test sont identiques à chaque chargement. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Minutes travaillées par jour ouvré, du plus ancien au plus récent (cycle). */
const WEEKDAY_PATTERN = [
  180, 195, 150, 180, 240, 185, 180, 120, 180, 200, 180, 90, 180, 185, 210, 180, 180, 165, 180, 190,
];
const NOTES = [
  'Refaire le noise 3D en TSL',
  'Nettoyer le shader de distorsion',
  'Capturer une vidéo WIP pour le case study',
  'Tester le displacement sur mobile',
  'Lire la doc ScrollTrigger (pin + scrub)',
  'Exporter le modèle Blender en glTF',
  '',
];

function pickCategory(rand: () => number): CategoryId {
  const r = rand();
  if (r < 0.3) return 'study';
  if (r < 0.55) return 'reproduction';
  if (r < 0.7) return 'design';
  if (r < 0.88) return 'experiment';
  return 'publish';
}

export function buildSeedData(now: number = Date.now()): AppData {
  const rand = mulberry32(2027);
  const today = todayKey(now);
  const data = createEmptyData();
  const sessions: Session[] = [];
  let patternIdx = 0;

  for (let offset = 27; offset >= 1; offset--) {
    const date = addDays(today, -offset);
    const dow = weekdayIndex(date);
    let minutes: number;
    if (dow === 6) minutes = 0;
    else if (dow === 5) minutes = rand() < 0.35 ? 150 : 0;
    else minutes = WEEKDAY_PATTERN[patternIdx++ % WEEKDAY_PATTERN.length];
    if (minutes === 0) continue;

    const parts = minutes >= 150 ? [Math.round(minutes * 0.45), minutes - Math.round(minutes * 0.45)] : [minutes];
    let hour = 7 + Math.floor(rand() * 3);
    parts.forEach((part, i) => {
      const categoryId = pickCategory(rand);
      const projectId: ProjectId | null =
        categoryId === 'study' ? null : rand() < 0.6 ? 'liquid-memories' : rand() < 0.6 ? 'type-in-motion' : null;
      const manual = rand() < 0.15;
      sessions.push({
        id: `seed-${date}-${i}`,
        date,
        startTime: `${String(hour).padStart(2, '0')}:${i === 0 ? '00' : '30'}`,
        durationSec: part * 60,
        categoryId,
        projectId,
        source: manual ? 'manual' : 'live',
        adjusted: !manual && rand() < 0.1,
        label: manual ? MANUAL_SESSION_LABEL : '',
        note: NOTES[Math.floor(rand() * NOTES.length)],
        createdAt: now - offset * 86_400_000 + i,
      });
      hour += Math.ceil(part / 60) + 1;
    });
  }

  sessions.push({
    id: `seed-${today}-0`,
    date: today,
    startTime: '08:00',
    durationSec: 75 * 60,
    categoryId: 'reproduction',
    projectId: 'liquid-memories',
    source: 'live',
    adjusted: false,
    label: '',
    note: 'Reprendre le fluid sim : advection des couleurs',
    createdAt: now,
  });

  data.sessions = sessions;
  data.projects = {
    ...structuredClone(DEFAULT_PROJECT_STATE),
    'liquid-memories': { status: 'in_progress', progress: 45 },
    'type-in-motion': { status: 'in_progress', progress: 15 },
  };
  return data;
}
