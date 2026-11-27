import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { cloudDownloadOutline, flaskOutline, trashOutline } from 'ionicons/icons';
import { useMemo, useState } from 'react';

import { ProjectStatusBadge } from '../components/Badges';
import Bar from '../components/Bar';
import ProjectEditor from '../components/ProjectEditor';
import { PROJECTS, QUARTERS } from '../data/program';
import { useNow } from '../hooks/useNow';
import { downloadJson } from '../lib/exportJson';
import { buildSeedData } from '../lib/seed';
import { quarterTotalSec, totalsByProject } from '../lib/stats';
import { formatDuration, formatHoursDecimal, parseDayKey, todayKey } from '../lib/time';
import { useStore } from '../state/AppStore';
import { createEmptyData } from '../storage/schema';
import type { ProjectId, Quarter } from '../types';

const DAY_MS = 86_400_000;

function quarterProgress(q: Quarter, today: string): number {
  if (today < q.start) return 0;
  if (today > q.end) return 1;
  const start = parseDayKey(q.start).getTime();
  const end = parseDayKey(q.end).getTime() + DAY_MS;
  return (parseDayKey(today).getTime() + DAY_MS / 2 - start) / (end - start);
}

const Roadmap: React.FC = () => {
  const { data, dispatch } = useStore();
  const now = useNow(true, 60_000);
  const today = todayKey(now);
  const [editing, setEditing] = useState<ProjectId | null>(null);
  const [confirm, setConfirm] = useState<'seed' | 'reset' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const byProject = useMemo(() => totalsByProject(data.sessions), [data.sessions]);
  const programStart = QUARTERS[0].start;
  const programEnd = QUARTERS[QUARTERS.length - 1].end;
  const daysToStart = Math.round((parseDayKey(programStart).getTime() - parseDayKey(today).getTime()) / DAY_MS);
  const totalSec = data.sessions.reduce((a, s) => a + s.durationSec, 0);
  const avgProgress = Math.round(PROJECTS.reduce((a, p) => a + data.projects[p.id].progress, 0) / PROJECTS.length);

  const programLine =
    today < programStart
      ? `Démarrage dans ${daysToStart} jour${daysToStart > 1 ? 's' : ''} — prépare le terrain.`
      : today > programEnd
        ? 'Programme 2027 terminé.'
        : `En cours : ${QUARTERS.find((q) => today >= q.start && today <= q.end)?.id ?? ''}`;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Roadmap & Projets</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="page">
          <header className="page-head">
            <p className="eyebrow">Programme Creative Developer</p>
            <h1>Roadmap 2027</h1>
            <p className="muted">{programLine}</p>
            <div className="kpis">
              <div>
                <span className="mono big">{formatHoursDecimal(totalSec)}</span>
                <span className="muted small">temps total</span>
              </div>
              <div>
                <span className="mono big">{avgProgress} %</span>
                <span className="muted small">portfolio moyen</span>
              </div>
              <div>
                <span className="mono big">
                  {PROJECTS.filter((p) => data.projects[p.id].status === 'done').length}/5
                </span>
                <span className="muted small">projets terminés</span>
              </div>
            </div>
          </header>

          <h2 className="section-title">Trimestres</h2>
          <div className="grid">
            {QUARTERS.map((q) => {
              const progress = quarterProgress(q, today);
              const state = progress >= 1 ? 'done' : progress > 0 ? 'in_progress' : 'upcoming';
              return (
                <article key={q.id} className={`card quarter${state === 'in_progress' ? ' is-current' : ''}`}>
                  <div className="card-head">
                    <span className="quarter-id mono">{q.id}</span>
                    <ProjectStatusBadge status={state} />
                  </div>
                  <h3>{q.title}</h3>
                  <p className="muted small">{q.months} 2027</p>
                  <Bar value={progress} tone="muted" height={4} label={`Avancement calendaire ${q.id}`} />
                  <p className="small quarter-time">
                    <span className="mono">{formatDuration(quarterTotalSec(data.sessions, q))}</span> enregistrées
                  </p>
                </article>
              );
            })}
          </div>

          <h2 className="section-title">5 projets portfolio</h2>
          <div className="projects">
            {PROJECTS.map((p) => {
              const st = data.projects[p.id];
              const t = byProject.get(p.id);
              return (
                <button key={p.id} type="button" className="card project" onClick={() => setEditing(p.id)}>
                  <div className="card-head">
                    <span className="project-name">
                      <span className="mono muted">0{p.index}</span> {p.name}
                    </span>
                    <ProjectStatusBadge status={st.status} />
                  </div>
                  <div className="chips">
                    {p.stack.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                  <Bar
                    value={st.progress / 100}
                    tone={st.status === 'done' ? 'success' : 'primary'}
                    height={6}
                    label={`Avancement ${p.name}`}
                  />
                  <div className="project-foot small">
                    <span className="mono">{st.progress} %</span>
                    <span className="muted">
                      <span className="mono">{formatDuration(t?.sec ?? 0)}</span> · {t?.count ?? 0} session
                      {(t?.count ?? 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="hint">Touche un projet pour changer son statut et son avancement.</p>

          <h2 className="section-title">Données</h2>
          <section className="card utilities">
            <p className="muted small">
              {data.sessions.length} sessions stockées localement sur cet appareil (hors-ligne). Pense à exporter
              régulièrement.
            </p>
            <IonButton expand="block" onClick={() => downloadJson(data)}>
              <IonIcon slot="start" icon={cloudDownloadOutline} />
              Export JSON
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={() => setConfirm('seed')}>
              <IonIcon slot="start" icon={flaskOutline} />
              Charger données de test
            </IonButton>
            <IonButton expand="block" fill="clear" color="danger" onClick={() => setConfirm('reset')}>
              <IonIcon slot="start" icon={trashOutline} />
              Réinitialiser les données
            </IonButton>
          </section>
        </div>

        <ProjectEditor
          projectId={editing}
          totalSec={editing ? (byProject.get(editing)?.sec ?? 0) : 0}
          onDismiss={() => setEditing(null)}
        />

        <IonAlert
          isOpen={confirm !== null}
          header={confirm === 'seed' ? 'Charger les données de test ?' : 'Réinitialiser toutes les données ?'}
          message={
            confirm === 'seed'
              ? 'Tes données actuelles seront remplacées par 4 semaines de sessions fictives. Exporte-les avant si besoin.'
              : 'Sessions, projets et chrono seront effacés définitivement. Exporte-les avant si besoin.'
          }
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            {
              text: confirm === 'seed' ? 'Charger' : 'Tout effacer',
              role: confirm === 'reset' ? 'destructive' : undefined,
              handler: () => {
                if (confirm === 'seed') {
                  dispatch({ type: 'data/replace', data: buildSeedData() });
                  setToast('Données de test chargées.');
                } else {
                  dispatch({ type: 'data/replace', data: createEmptyData() });
                  setToast('Données réinitialisées.');
                }
              },
            },
          ]}
          onDidDismiss={() => setConfirm(null)}
        />
        <IonToast
          isOpen={toast !== null}
          message={toast ?? ''}
          color="success"
          duration={2500}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Roadmap;
