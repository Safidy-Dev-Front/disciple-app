import {
  IonAlert,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/react';
import { useState } from 'react';

import { CATEGORY_BY_ID, PROJECT_BY_ID } from '../data/program';
import { formatDuration } from '../lib/time';
import { useStore } from '../state/AppStore';
import type { Session } from '../types';

import { KindBadge, SourceBadge } from './Badges';

interface Props {
  sessions: Session[];
  onEdit: (session: Session) => void;
  emptyText?: string;
  showHint?: boolean;
}

const SessionList: React.FC<Props> = ({
  sessions,
  onEdit,
  emptyText = 'Aucune session enregistrée.',
  showHint = true,
}) => {
  const { dispatch } = useStore();
  const [toDelete, setToDelete] = useState<Session | null>(null);

  if (sessions.length === 0) return <p className="empty">{emptyText}</p>;

  return (
    <>
      <IonList inset className="session-list">
        {sessions.map((s) => (
          <IonItemSliding key={s.id}>
            <IonItem button detail={false} onClick={() => onEdit(s)}>
              <IonLabel>
                <div className="session-title">
                  <span>{CATEGORY_BY_ID[s.categoryId].label}</span>
                  <span className="mono">{formatDuration(s.durationSec)}</span>
                </div>
                <div className="session-meta">
                  <span className="muted">{s.startTime}</span>
                  <SourceBadge session={s} />
                  <KindBadge categoryId={s.categoryId} />
                  {s.projectId && <span className="badge badge-project">{PROJECT_BY_ID[s.projectId].name}</span>}
                </div>
                {s.label && <p className="session-label">{s.label}</p>}
                {s.note && <p className="session-note">→ {s.note}</p>}
              </IonLabel>
            </IonItem>
            <IonItemOptions side="end">
              <IonItemOption onClick={() => onEdit(s)}>Modifier</IonItemOption>
              <IonItemOption color="danger" onClick={() => setToDelete(s)}>
                Supprimer
              </IonItemOption>
            </IonItemOptions>
          </IonItemSliding>
        ))}
      </IonList>
      {showHint && (
        <IonNote className="hint">
          Astuce : touche une session pour la modifier, glisse vers la gauche pour supprimer.
        </IonNote>
      )}
      <IonAlert
        isOpen={toDelete !== null}
        header="Supprimer cette session ?"
        message={
          toDelete ? `${formatDuration(toDelete.durationSec)} · ${CATEGORY_BY_ID[toDelete.categoryId].label}` : ''
        }
        buttons={[
          { text: 'Annuler', role: 'cancel' },
          {
            text: 'Supprimer',
            role: 'destructive',
            handler: () => {
              if (toDelete) dispatch({ type: 'session/delete', id: toDelete.id });
            },
          },
        ]}
        onDidDismiss={() => setToDelete(null)}
      />
    </>
  );
};

export default SessionList;
