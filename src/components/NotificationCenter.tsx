import { IonToast } from '@ionic/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useNow } from '../hooks/useNow';
import { playChime } from '../lib/audio';
import { showSystemNotification } from '../lib/notify';
import { formatHMS } from '../lib/time';
import { elapsedMs } from '../lib/timer';
import { useStore } from '../state/AppStore';
import { checkReminders, type ReminderEvent } from '../state/reminders';

const BASE_TITLE = 'Discipline 2027 — Creative Dev';

export interface ActiveAlert extends ReminderEvent {
  id: number;
}

interface AlertContextValue {
  alert: ActiveAlert | null;
  dismiss: () => void;
}

const AlertContext = createContext<AlertContextValue>({ alert: null, dismiss: () => undefined });

// eslint-disable-next-line react-refresh/only-export-components
export const useAlert = (): AlertContextValue => useContext(AlertContext);

const appIsInBackground = (): boolean => document.visibilityState !== 'visible' || !document.hasFocus();

/**
 * Centre de notifications, monté une seule fois au-dessus des onglets :
 * - interroge le moteur de rappels (1 s si le chrono tourne, 30 s sinon) ;
 * - affiche l'alerte dans l'app (toast) et dans le mini-minuteur ;
 * - joue le son discret et envoie une notification système si l'app est réduite.
 */
const NotificationCenter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, dispatch } = useStore();
  const { timer } = data;
  const running = timer.status === 'running';
  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  const latest = useRef(data);

  useEffect(() => {
    latest.current = data;
  }, [data]);

  const emit = useCallback((events: ReminderEvent[]) => {
    const { settings: s } = latest.current;
    for (const event of events) {
      if (s.notifications && appIsInBackground()) {
        void showSystemNotification({ title: event.title, body: event.body, tag: event.tag, sticky: event.sticky });
      }
    }
    if (s.sound) playChime();
    // Vibration (mobile) seulement après une interaction, sinon le navigateur la bloque.
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(200);
    // Plusieurs rappels simultanés : on affiche le plus important (le premier).
    setAlert({ ...events[0], id: Date.now() });
  }, []);

  useEffect(() => {
    const check = () => {
      const { events, timerPatch, notifiedPatch } = checkReminders(latest.current, Date.now());
      if (events.length === 0) return;
      if (Object.keys(timerPatch).length) dispatch({ type: 'timer/configure', patch: timerPatch });
      if (Object.keys(notifiedPatch).length) dispatch({ type: 'notified/mark', patch: notifiedPatch });
      // Le dispatch est synchrone côté reducer mais le ref n'est rafraîchi qu'au rendu :
      // on l'avance tout de suite pour ne jamais émettre deux fois le même rappel.
      latest.current = {
        ...latest.current,
        timer: { ...latest.current.timer, ...timerPatch },
        notified: { ...latest.current.notified, ...notifiedPatch },
      };
      emit(events);
    };
    const kick = window.setTimeout(check, 0);
    const id = window.setInterval(check, running ? 1000 : 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [running, dispatch, emit]);

  // Temps du chrono dans le titre de l'onglet / de la fenêtre.
  const now = useNow(running);
  useEffect(() => {
    document.title =
      timer.status === 'idle' ? BASE_TITLE : `${running ? '●' : '❚❚'} ${formatHMS(elapsedMs(timer, now))} · Discipline`;
  }, [now, running, timer]);

  const dismiss = useCallback(() => setAlert(null), []);
  const value = useMemo(() => ({ alert, dismiss }), [alert, dismiss]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <IonToast
        isOpen={alert !== null}
        header={alert?.title}
        message={alert?.body ?? ''}
        color={alert?.kind === 'goal' ? 'success' : 'warning'}
        position="top"
        duration={alert?.sticky ? 0 : 8000}
        buttons={[{ text: 'OK', role: 'cancel' }]}
        onDidDismiss={dismiss}
      />
    </AlertContext.Provider>
  );
};

export default NotificationCenter;
