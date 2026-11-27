import { IonButton, IonIcon, IonItem, IonList, IonNote, IonSelect, IonSelectOption, IonToggle } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import { useState } from 'react';

import { playChime, unlockAudio } from '../lib/audio';
import { notificationPermission, requestNotificationPermission, showSystemNotification } from '../lib/notify';
import { useMiniTimer } from '../mini/MiniTimerProvider';
import { useStore } from '../state/AppStore';
import type { Settings } from '../types';

const OFF = 'off';
const REMINDER_HOURS = [17, 18, 19, 20, 21];
const PAUSE_MINUTES = [10, 15, 20, 30];

const PERMISSION_TEXT: Record<ReturnType<typeof notificationPermission>, string> = {
  granted: 'Autorisées par le navigateur.',
  default: 'Le navigateur demandera ton autorisation.',
  denied: 'Bloquées par le navigateur : réautorise-les dans les réglages du site (icône à gauche de l’URL).',
  unsupported: 'Ce navigateur ne gère pas les notifications système ; les alertes restent visibles dans l’app.',
};

const NotificationSettings: React.FC = () => {
  const { data, dispatch } = useStore();
  const { settings } = data;
  const mini = useMiniTimer();
  const [permission, setPermission] = useState(notificationPermission);

  const update = (patch: Partial<Settings>) => dispatch({ type: 'settings/update', patch });

  const toggleNotifications = async (on: boolean) => {
    if (!on) return update({ notifications: false });
    const result = await requestNotificationPermission();
    setPermission(result);
    update({ notifications: result === 'granted' });
  };

  const test = () => {
    unlockAudio();
    if (settings.sound) playChime();
    void showSystemNotification({
      title: 'Discipline 2027',
      body: 'Les notifications fonctionnent. Réduis l’app : les rappels arriveront ici.',
      tag: 'test',
    });
  };

  const active = settings.notifications && permission === 'granted';

  return (
    <>
      <h2 className="section-title">Notifications & rappels</h2>
      <IonList inset className="form-list">
        <IonItem>
          <IonToggle
            checked={active}
            disabled={permission === 'unsupported'}
            onIonChange={(e) => void toggleNotifications(e.detail.checked)}
          >
            Notifications système
            <IonNote className="toggle-note">{PERMISSION_TEXT[permission]}</IonNote>
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle checked={settings.sound} onIonChange={(e) => update({ sound: e.detail.checked })}>
            Son des alertes
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonSelect
            label="Rappel si les 3 h ne sont pas faites"
            labelPlacement="stacked"
            interface="popover"
            value={settings.dailyReminderHour ?? OFF}
            onIonChange={(e) =>
              update({ dailyReminderHour: typeof e.detail.value === 'number' ? e.detail.value : null })
            }
          >
            <IonSelectOption value={OFF}>Désactivé</IonSelectOption>
            {REMINDER_HOURS.map((h) => (
              <IonSelectOption key={h} value={h}>
                À partir de {h} h (jours de travail)
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonSelect
            label="Rappel quand une pause s’éternise"
            labelPlacement="stacked"
            interface="popover"
            value={settings.pauseReminderMin ?? OFF}
            onIonChange={(e) =>
              update({ pauseReminderMin: typeof e.detail.value === 'number' ? e.detail.value : null })
            }
          >
            <IonSelectOption value={OFF}>Désactivé</IonSelectOption>
            {PAUSE_MINUTES.map((m) => (
              <IonSelectOption key={m} value={m}>
                Après {m} min de pause
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonToggle checked={settings.autoMiniTimer} onIonChange={(e) => update({ autoMiniTimer: e.detail.checked })}>
            Mini-minuteur flottant au démarrage
            <IonNote className="toggle-note">
              {mini.mode === 'pip'
                ? 'Fenêtre toujours au premier plan, visible quand l’app est réduite.'
                : 'Ouverture automatique réservée à Chrome / Edge. Ici, utilise le bouton « Mini-minuteur flottant ».'}
            </IonNote>
          </IonToggle>
        </IonItem>
      </IonList>
      <IonButton expand="block" fill="outline" onClick={test}>
        <IonIcon slot="start" icon={notificationsOutline} />
        Tester une notification
      </IonButton>
      <p className="hint">
        Rappels émis : fin de bloc guidé, minuteur écoulé, 3 h validées, pause trop longue, rappel du soir. Ils
        fonctionnent tant que l’app (ou le mini-minuteur) reste ouverte, même réduite — pas de serveur, tout reste
        hors-ligne.
      </p>
    </>
  );
};

export default NotificationSettings;
