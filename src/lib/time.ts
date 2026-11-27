const pad = (n: number): string => String(n).padStart(2, '0');

/** Clé de jour locale YYYY-MM-DD (pas d'UTC : minuit = minuit chez toi). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function todayKey(now: number = Date.now()): string {
  return dayKey(new Date(now));
}

export function timeOfDay(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lundi de la semaine contenant `key`. */
export function weekStart(key: string): string {
  const d = parseDayKey(key);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return addDays(key, -dow);
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayIndex(key: string): number {
  return (parseDayKey(key).getDay() + 6) % 7;
}

/** 03:00:00 */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 2 h 05 · 45 min · 0 min */
export function formatDuration(sec: number): string {
  const totalMin = Math.floor(Math.max(0, sec) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${pad(m)}`;
}

/** 12,5 h */
export function formatHoursDecimal(sec: number): string {
  const h = sec / 3600;
  return `${h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`;
}

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });

export function formatDayLong(key: string): string {
  const s = dayFormatter.format(parseDayKey(key));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDayShort(key: string): string {
  return shortDayFormatter.format(parseDayKey(key)).replace('.', '');
}

export function isValidDayKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseDayKey(v).getTime());
}

export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
