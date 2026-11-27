import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import {
  addOutline,
  browsersOutline,
  closeOutline,
  pauseOutline,
  playOutline,
  saveOutline,
  stopOutline,
} from 'ionicons/icons';
import { useMemo, useState } from 'react';

import { SourceBadge, StatusBadge } from '../components/Badges';
import Bar from '../components/Bar';
import { CategorySelect, ProjectSelect } from '../components/Pickers';
import ProgressRing from '../components/ProgressRing';
import SessionEditor, { type EditorRequest } from '../components/SessionEditor';
import SessionList from '../components/SessionList';
import { CATEGORY_BY_ID, DAILY_GOAL_MIN, GUIDED_BLOCKS } from '../data/program';
import { useNow } from '../hooks/useNow';
import { unlockAudio } from '../lib/audio';
import { DAILY_GOAL_SEC, SPRINT_THRESHOLD_SEC, dayStatus, getDay, totalsByDay } from '../lib/stats';
import { dayKey, formatDayLong, formatDuration, formatHMS, timeOfDay, todayKey } from '../lib/time';
import { elapsedMs, guidedPosition } from '../lib/timer';
import { useMiniTimer } from '../mini/MiniTimerProvider';
import { useStore } from '../state/AppStore';
import { MIN_SESSION_SEC } from '../state/reducer';

const GOAL_MS = DAILY_GOAL_MIN * 60_000;
const TARGET_OPTIONS = [25, 50, 75, 90, 120];
const NO_TARGET = 'none';

const Today: React.FC = () => {
  const { data, dispatch } = useStore();
  const { timer, settings } = data;
  const running = timer.status === 'running';
  // 1 s quand le chrono tourne, sinon 30 s (suffisant pour le passage de minuit).
  const now = useNow(true, running ? 1000 : 30_000);
  const today = todayKey(now);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [miniBlocked, setMiniBlocked] = useState(false);
  const mini = useMiniTimer();

  const byDay = useMemo(() => totalsByDay(data.sessions), [data.sessions]);
  const todaySessions = useMemo(() => data.sessions.filter((s) => s.date === today), [data.sessions, today]);
  const saved = getDay(byDay, today);

  const elapsed = elapsedMs(timer, now);
  const timerCountsToday =
    timer.status !== 'idle' && timer.sessionStartedAt !== null && dayKey(new Date(timer.sessionStartedAt)) === today;
  const totalMs = saved.total * 1000 + (timerCountsToday ? elapsed : 0);
  const totalSec = Math.floor(totalMs / 1000);
  const status = dayStatus(totalSec, today, today, settings.sprintWeek);
  const remainingMs = GOAL_MS - totalMs;
  const tone = totalSec >= SPRINT_THRESHOLD_SEC ? 'sprint' : totalSec >= DAILY_GOAL_SEC ? 'success' : 'primary';
  const guided = guidedPosition(elapsed);

  const start = () => {
    unlockAudio();
    dispatch({ type: 'timer/start', now: Date.now() });
    // Fenêtre flottante ouverte d'office (seulement en Picture-in-Picture : une popup
    // automatique serait intrusive). Le clic sur Démarrer sert de geste utilisateur.
    if (settings.autoMiniTimer && mini.mode === 'pip' && !mini.isOpen) void mini.open();
  };

  const toggleMini = async () => {
    if (mini.isOpen) return mini.close();
    setMiniBlocked(!(await mini.open()));
  };

  const setTarget = (value: unknown) => {
    const targetMin = typeof value === 'number' ? value : null;
    // Nouveau minuteur déjà dépassé : on ne sonne pas rétroactivement.
    const targetNotified = targetMin !== null && elapsed >= targetMin * 60_000;
    dispatch({ type: 'timer/configure', patch: { targetMin, targetNotified } });
  };

  const targetLeftMs = timer.targetMin !== null ? timer.targetMin * 60_000 - elapsed : null;

  const openSave = () => {
    const t = Date.now();
    if (running) dispatch({ type: 'timer/pause', now: t });
    const started = new Date(timer.sessionStartedAt ?? t);
    setEditor({
      mode: 'save-live',
      elapsedMs: elapsedMs(timer, t),
      date: dayKey(started),
      startTime: timeOfDay(started),
    });
  };

  const toggleGuided = (on: boolean) => {
    // En activant en cours de route, on ne ré-alerte pas les blocs déjà passés.
    dispatch({ type: 'timer/configure', patch: { guided: on, blocksNotified: guidedPosition(elapsed).completed } });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Aujourd'hui</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="page">
          <header className="page-head">
            <p className="eyebrow">Discipline 2027 — Creative Dev</p>
            <h1>{formatDayLong(today)}</h1>
          </header>

          {/* Progression du jour */}
          <section className="card center">
            <ProgressRing value={totalMs / GOAL_MS} tone={tone}>
              <div className="mono ring-time">{formatHMS(totalMs)}</div>
              <div className="muted small">sur 03:00:00</div>
              <StatusBadge status={status} />
            </ProgressRing>
            <p className="remaining">
              {remainingMs > 0 ? (
                <>
                  Reste <strong className="mono">{formatHMS(remainingMs)}</strong> pour valider la journée
                </>
              ) : (
                <>
                  Objectif atteint · <strong className="mono">+{formatHMS(-remainingMs)}</strong>
                </>
              )}
            </p>
            <div className="split">
              <span>
                <SourceBadge session={{ source: 'live', adjusted: false }} /> {formatDuration(saved.live)}
              </span>
              <span>
                <SourceBadge session={{ source: 'manual', adjusted: false }} /> {formatDuration(saved.manual)}
              </span>
              {timerCountsToday && <span className="muted">+ {formatDuration(elapsed / 1000)} en cours</span>}
            </div>
          </section>

          {/* Chronomètre */}
          <section className={`card timer-card timer-${timer.status}`}>
            <div className="card-head">
              <h2>Session</h2>
              <span className={`dot dot-${timer.status}`}>
                {timer.status === 'running' ? 'En cours' : timer.status === 'paused' ? 'En pause' : 'Prête'}
              </span>
            </div>
            <div className="mono timer-display">{formatHMS(elapsed)}</div>
            <div className="timer-meta muted">
              {CATEGORY_BY_ID[timer.categoryId].label}
              {timer.guided && ' · Session guidée 3h'}
              {!timer.guided && targetLeftMs !== null && (
                <>
                  {' · '}
                  {timer.status === 'idle' ? (
                    `Minuteur ${timer.targetMin} min`
                  ) : targetLeftMs > 0 ? (
                    <>
                      Minuteur : reste <span className="mono">{formatHMS(targetLeftMs)}</span>
                    </>
                  ) : (
                    <strong className="target-done">Minuteur écoulé</strong>
                  )}
                </>
              )}
            </div>
            <div className="timer-actions">
              {timer.status === 'idle' && (
                <IonButton size="large" onClick={start}>
                  <IonIcon slot="start" icon={playOutline} />
                  Démarrer
                </IonButton>
              )}
              {timer.status === 'running' && (
                <IonButton
                  size="large"
                  color="medium"
                  onClick={() => dispatch({ type: 'timer/pause', now: Date.now() })}
                >
                  <IonIcon slot="start" icon={pauseOutline} />
                  Pause
                </IonButton>
              )}
              {timer.status === 'paused' && (
                <IonButton size="large" onClick={() => dispatch({ type: 'timer/resume', now: Date.now() })}>
                  <IonIcon slot="start" icon={playOutline} />
                  Reprendre
                </IonButton>
              )}
              {timer.status !== 'idle' && (
                <IonButton size="large" color="success" onClick={openSave} disabled={elapsed / 1000 < MIN_SESSION_SEC}>
                  <IonIcon slot="start" icon={saveOutline} />
                  Enregistrer la session
                </IonButton>
              )}
              {timer.status === 'paused' && (
                <IonButton fill="clear" color="danger" onClick={() => setConfirmDiscard(true)}>
                  <IonIcon slot="start" icon={stopOutline} />
                  Abandonner
                </IonButton>
              )}
            </div>
            {timer.status !== 'idle' && elapsed / 1000 < MIN_SESSION_SEC && (
              <p className="muted small center-text">Enregistrement possible après 1 minute.</p>
            )}
            <div className="mini-toggle">
              <IonButton size="small" fill="outline" onClick={() => void toggleMini()}>
                <IonIcon slot="start" icon={mini.isOpen ? closeOutline : browsersOutline} />
                {mini.isOpen ? 'Fermer le mini-minuteur' : 'Mini-minuteur flottant'}
              </IonButton>
              {miniBlocked && (
                <p className="muted small center-text">
                  Fenêtre bloquée par le navigateur : autorise les popups pour ce site.
                </p>
              )}
            </div>
          </section>

          {/* Paramètres de la session */}
          <IonList inset className="form-list">
            <IonItem>
              <CategorySelect
                value={timer.categoryId}
                onChange={(v) => dispatch({ type: 'timer/configure', patch: { categoryId: v } })}
              />
            </IonItem>
            <IonItem>
              <ProjectSelect
                value={timer.projectId}
                onChange={(v) => dispatch({ type: 'timer/configure', patch: { projectId: v } })}
              />
            </IonItem>
            <IonItem>
              <IonToggle checked={timer.guided} onIonChange={(e) => toggleGuided(e.detail.checked)}>
                Session guidée 3h <span className="muted">(75 / 15 / 75 / 15)</span>
              </IonToggle>
            </IonItem>
            {!timer.guided && (
              <IonItem>
                <IonSelect
                  label="Minuteur (mode libre)"
                  labelPlacement="stacked"
                  interface="popover"
                  value={timer.targetMin ?? NO_TARGET}
                  onIonChange={(e) => setTarget(e.detail.value)}
                >
                  <IonSelectOption value={NO_TARGET}>Aucun — chrono libre</IonSelectOption>
                  {TARGET_OPTIONS.map((m) => (
                    <IonSelectOption key={m} value={m}>
                      {m} min
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            )}
          </IonList>

          {/* Blocs guidés */}
          {timer.guided && (
            <section className="card guided">
              {GUIDED_BLOCKS.map((b, i) => {
                const done = i < guided.completed;
                const active = timer.status !== 'idle' && i === guided.index;
                return (
                  <div
                    key={b.key}
                    className={`block block-${b.kind}${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                  >
                    <div className="block-head">
                      <span className="block-title">
                        {i + 1}. {b.title}
                      </span>
                      <span className="mono small">
                        {active ? `-${formatHMS(guided.blockRemainingMs)}` : done ? '✓' : `${b.minutes} min`}
                      </span>
                    </div>
                    <div className="muted small">{b.subtitle}</div>
                    {active && (
                      <Bar
                        value={guided.blockElapsedMs / guided.blockDurationMs}
                        tone={b.kind === 'work' ? 'primary' : 'muted'}
                        height={4}
                      />
                    )}
                  </div>
                );
              })}
              {guided.completed >= GUIDED_BLOCKS.length && (
                <p className="guided-done">Les 4 blocs sont terminés : enregistre ta session.</p>
              )}
            </section>
          )}

          {/* Sessions du jour */}
          <div className="section-head">
            <h2>Sessions du jour</h2>
            <IonButton size="small" fill="outline" onClick={() => setEditor({ mode: 'add', date: today })}>
              <IonIcon slot="start" icon={addOutline} />
              Ajout manuel
            </IonButton>
          </div>
          <SessionList
            sessions={todaySessions}
            onEdit={(s) => setEditor({ mode: 'edit', session: s })}
            emptyText="Rien d'enregistré aujourd'hui. Lance le chrono !"
          />
        </div>

        <SessionEditor request={editor} onDismiss={() => setEditor(null)} />
        <IonAlert
          isOpen={confirmDiscard}
          header="Abandonner la session ?"
          message={`Les ${formatHMS(elapsed)} chronométrées ne seront pas enregistrées.`}
          buttons={[
            { text: 'Garder', role: 'cancel' },
            { text: 'Abandonner', role: 'destructive', handler: () => dispatch({ type: 'timer/discard' }) },
          ]}
          onDidDismiss={() => setConfirmDiscard(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Today;
