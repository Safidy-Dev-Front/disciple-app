import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonNote,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useRef, useState } from 'react';

import { MANUAL_SESSION_LABEL } from '../data/program';
import { newId } from '../lib/id';
import { formatHMS, isValidDayKey, isValidTime, todayKey } from '../lib/time';
import { useStore } from '../state/AppStore';
import { MIN_SESSION_SEC } from '../state/reducer';
import type { CategoryId, ProjectId, Session } from '../types';

import { SourceBadge } from './Badges';
import { CategorySelect, ProjectSelect } from './Pickers';

export type EditorRequest =
  | { mode: 'save-live'; elapsedMs: number; date: string; startTime: string }
  | { mode: 'add'; date?: string }
  | { mode: 'edit'; session: Session };

interface Props {
  request: EditorRequest | null;
  onDismiss: () => void;
}

const SessionEditor: React.FC<Props> = ({ request, onDismiss }) => {
  const modal = useRef<HTMLIonModalElement>(null);
  return (
    <IonModal ref={modal} isOpen={request !== null} onDidDismiss={onDismiss}>
      {request && <EditorForm request={request} close={() => modal.current?.dismiss()} />}
    </IonModal>
  );
};

const TITLES: Record<EditorRequest['mode'], string> = {
  'save-live': 'Enregistrer la session',
  add: 'Ajouter une session',
  edit: 'Modifier la session',
};

const EditorForm: React.FC<{ request: EditorRequest; close: () => void }> = ({ request, close }) => {
  const { data, dispatch } = useStore();
  const existing = request.mode === 'edit' ? request.session : null;
  const isLive = request.mode === 'save-live';

  const initialSec = existing?.durationSec ?? 0;
  const [date, setDate] = useState(existing?.date ?? (request.mode === 'add' ? (request.date ?? todayKey()) : ''));
  const [startTime, setStartTime] = useState(existing?.startTime ?? '09:00');
  const [hours, setHours] = useState(String(Math.floor(initialSec / 3600)));
  const [minutes, setMinutes] = useState(String(Math.round((initialSec % 3600) / 60)));
  const [categoryId, setCategoryId] = useState<CategoryId>(existing?.categoryId ?? data.timer.categoryId);
  const [projectId, setProjectId] = useState<ProjectId | null>(existing ? existing.projectId : data.timer.projectId);
  const [label, setLabel] = useState(existing?.label ?? (request.mode === 'add' ? MANUAL_SESSION_LABEL : ''));
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const durationSec = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60;

  const submit = () => {
    if (request.mode === 'save-live') {
      if (request.elapsedMs / 1000 < MIN_SESSION_SEC) {
        setError('Une session doit durer au moins 1 minute.');
        return;
      }
      dispatch({ type: 'timer/configure', patch: { categoryId, projectId } });
      dispatch({ type: 'timer/save', now: Date.now(), id: newId(), note });
      close();
      return;
    }
    if (!isValidDayKey(date)) return setError('Date invalide.');
    if (!isValidTime(startTime)) return setError('Heure de début invalide (HH:MM).');
    if (durationSec < MIN_SESSION_SEC) return setError('Durée minimale : 1 minute.');
    if (durationSec > 16 * 3600) return setError('Durée maximale : 16 h par session.');

    if (existing) {
      const durationChanged = Math.abs(durationSec - existing.durationSec) >= 60;
      dispatch({
        type: 'session/update',
        session: {
          ...existing,
          date,
          startTime,
          // On ne réécrit la durée que si elle a été modifiée (préserve les secondes chronométrées).
          durationSec: durationChanged ? durationSec : existing.durationSec,
          categoryId,
          projectId,
          label: label.trim(),
          note: note.trim(),
          adjusted: existing.adjusted || (existing.source === 'live' && durationChanged),
        },
      });
    } else {
      dispatch({
        type: 'session/add',
        session: {
          id: newId(),
          date,
          startTime,
          durationSec,
          categoryId,
          projectId,
          source: 'manual',
          adjusted: false,
          label: label.trim() || MANUAL_SESSION_LABEL,
          note: note.trim(),
          createdAt: Date.now(),
        },
      });
    }
    close();
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={close}>Annuler</IonButton>
          </IonButtons>
          <IonTitle>{TITLES[request.mode]}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={submit}>
              {isLive ? 'Enregistrer' : 'Valider'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {isLive ? (
          <div className="card editor-summary">
            <div className="muted">Temps chronométré</div>
            <div className="mono big">{formatHMS(request.elapsedMs)}</div>
            <div className="muted">
              Démarrée le {request.date} à {request.startTime} ·{' '}
              <SourceBadge session={{ source: 'live', adjusted: false }} />
            </div>
          </div>
        ) : (
          <div className="editor-source">
            <SourceBadge session={existing ?? { source: 'manual', adjusted: false }} />
            {existing?.source === 'live' && <IonNote>Modifier la durée marquera cette session « ajustée ».</IonNote>}
          </div>
        )}

        <IonList inset className="form-list">
          {!isLive && (
            <>
              <IonItem>
                <IonInput
                  label="Date"
                  labelPlacement="stacked"
                  type="date"
                  value={date}
                  onIonInput={(e) => setDate(String(e.detail.value ?? ''))}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Heure de début"
                  labelPlacement="stacked"
                  type="time"
                  value={startTime}
                  onIonInput={(e) => setStartTime(String(e.detail.value ?? ''))}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Heures"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="numeric"
                  min={0}
                  max={16}
                  value={hours}
                  onIonInput={(e) => setHours(String(e.detail.value ?? ''))}
                />
                <IonInput
                  label="Minutes"
                  labelPlacement="stacked"
                  type="number"
                  inputmode="numeric"
                  min={0}
                  max={59}
                  value={minutes}
                  onIonInput={(e) => setMinutes(String(e.detail.value ?? ''))}
                />
              </IonItem>
              <IonItem>
                <IonInput
                  label="Intitulé"
                  labelPlacement="stacked"
                  placeholder={MANUAL_SESSION_LABEL}
                  value={label}
                  onIonInput={(e) => setLabel(String(e.detail.value ?? ''))}
                />
              </IonItem>
            </>
          )}
          <IonItem>
            <CategorySelect value={categoryId} onChange={setCategoryId} />
          </IonItem>
          <IonItem>
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </IonItem>
          <IonItem>
            <IonTextarea
              label="Prochaine micro-tâche / Note"
              labelPlacement="stacked"
              autoGrow
              rows={3}
              placeholder="Ex : brancher le noise sur le displacement du mesh"
              value={note}
              onIonInput={(e) => setNote(String(e.detail.value ?? ''))}
            />
          </IonItem>
        </IonList>

        {error && <p className="form-error">{error}</p>}

        <IonButton expand="block" onClick={submit} className="ion-margin-top">
          {isLive ? 'Enregistrer la session' : 'Valider'}
        </IonButton>

        {existing && (
          <>
            <IonButton expand="block" fill="clear" color="danger" onClick={() => setConfirmDelete(true)}>
              Supprimer la session
            </IonButton>
            <IonAlert
              isOpen={confirmDelete}
              header="Supprimer cette session ?"
              message="Cette action est définitive."
              buttons={[
                { text: 'Annuler', role: 'cancel' },
                {
                  text: 'Supprimer',
                  role: 'destructive',
                  handler: () => {
                    dispatch({ type: 'session/delete', id: existing.id });
                    close();
                  },
                },
              ]}
              onDidDismiss={() => setConfirmDelete(false)}
            />
          </>
        )}
      </IonContent>
    </>
  );
};

export default SessionEditor;
