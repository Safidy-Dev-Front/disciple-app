/**
 * Bip discret généré par la Web Audio API : aucun fichier audio à charger.
 * L'AudioContext est créé paresseusement et « débloqué » au premier geste
 * utilisateur (bouton Démarrer), comme l'exigent les navigateurs.
 */
type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** À appeler depuis un handler de clic pour autoriser le son plus tard. */
export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === 'suspended') void c.resume();
}

/** Deux notes courtes et douces (≈ 0,5 s au total). */
export function playChime(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t0 = c.currentTime + 0.02;
  const notes: [number, number][] = [
    [880, 0],
    [1318.5, 0.18],
  ];
  for (const [freq, offset] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + offset;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  }
}
