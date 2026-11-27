import { IonToast } from '@ionic/react';
import { useEffect, useState } from 'react';

import { GUIDED_BLOCKS } from '../data/program';
import { useNow } from '../hooks/useNow';
import { playChime } from '../lib/audio';
import { formatHMS } from '../lib/time';
import { elapsedMs, guidedPosition } from '../lib/timer';
import { useStore } from '../state/AppStore';

const BASE_TITLE = 'Discipline 2027 — Creative Dev';

/**
 * Composant invisible monté une seule fois : il surveille le chrono (même si
 * l'utilisateur est sur un autre onglet), déclenche l'alerte visuelle + sonore
 * de fin de bloc guidé et affiche le temps dans le titre de la fenêtre.
 */
const GuidedWatcher: React.FC = () => {
  const { data, dispatch } = useStore();
  const { timer, settings } = data;
  const running = timer.status === 'running';
  const now = useNow(running);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!running || !timer.guided) return;
    const check = () => {
      const completed = guidedPosition(elapsedMs(timer, Date.now())).completed;
      if (completed <= timer.blocksNotified) return;
      // Si plusieurs blocs se sont terminés pendant une veille, une seule alerte.
      const ended = GUIDED_BLOCKS[completed - 1];
      const next = GUIDED_BLOCKS[completed];
      dispatch({ type: 'timer/configure', patch: { blocksNotified: completed } });
      setMessage(
        next
          ? `« ${ended.title} » terminé. Place à : ${next.title} (${next.minutes} min).`
          : 'Session guidée de 3 h terminée. Enregistre ta session !',
      );
      if (settings.sound) playChime();
      navigator.vibrate?.(200);
    };
    const kick = window.setTimeout(check, 0);
    const id = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [running, timer, settings.sound, dispatch]);

  useEffect(() => {
    document.title =
      timer.status === 'idle' ? BASE_TITLE : `${running ? '●' : '❚❚'} ${formatHMS(elapsedMs(timer, now))} · Discipline`;
  }, [now, running, timer]);

  return (
    <IonToast
      isOpen={message !== null}
      message={message ?? ''}
      color="warning"
      position="top"
      duration={10_000}
      buttons={[{ text: 'OK', role: 'cancel' }]}
      onDidDismiss={() => setMessage(null)}
    />
  );
};

export default GuidedWatcher;
