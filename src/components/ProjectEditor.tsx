import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonModal,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useRef } from 'react';

import { PROJECT_BY_ID, PROJECT_STATUS_LABEL } from '../data/program';
import { formatDuration } from '../lib/time';
import { useStore } from '../state/AppStore';
import type { ProjectId, ProjectStatus } from '../types';

interface Props {
  projectId: ProjectId | null;
  totalSec: number;
  onDismiss: () => void;
}

const STATUSES: ProjectStatus[] = ['upcoming', 'in_progress', 'done'];

const ProjectEditor: React.FC<Props> = ({ projectId, totalSec, onDismiss }) => {
  const modal = useRef<HTMLIonModalElement>(null);
  const { data, dispatch } = useStore();
  const meta = projectId ? PROJECT_BY_ID[projectId] : null;
  const state = projectId ? data.projects[projectId] : null;

  return (
    <IonModal
      ref={modal}
      isOpen={projectId !== null}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 1]}
    >
      {meta && state && projectId && (
        <>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                {meta.index}. {meta.name}
              </IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => modal.current?.dismiss()}>Fermer</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <p className="muted">
              {meta.stack.join(' · ')} — {formatDuration(totalSec)} enregistrées
            </p>
            <h3 className="field-title">Statut</h3>
            <IonSegment
              value={state.status}
              onIonChange={(e) => {
                const status = STATUSES.find((s) => s === e.detail.value);
                if (!status) return;
                dispatch({
                  type: 'project/update',
                  id: projectId,
                  patch: status === 'done' ? { status, progress: 100 } : { status },
                });
              }}
            >
              {STATUSES.map((s) => (
                <IonSegmentButton key={s} value={s}>
                  <IonLabel>{PROJECT_STATUS_LABEL[s]}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
            <h3 className="field-title">
              Avancement <span className="mono">{state.progress} %</span>
            </h3>
            <IonRange
              aria-label="Avancement"
              min={0}
              max={100}
              step={5}
              snaps
              value={state.progress}
              onIonChange={(e) => {
                const progress = typeof e.detail.value === 'number' ? e.detail.value : state.progress;
                dispatch({
                  type: 'project/update',
                  id: projectId,
                  patch: {
                    progress,
                    // Passage automatique de statut cohérent avec l'avancement.
                    status:
                      progress === 100
                        ? 'done'
                        : progress > 0 && state.status !== 'in_progress'
                          ? 'in_progress'
                          : state.status,
                  },
                });
              }}
            />
          </IonContent>
        </>
      )}
    </IonModal>
  );
};

export default ProjectEditor;
