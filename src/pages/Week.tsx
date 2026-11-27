import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { addOutline, checkmarkCircle, ellipseOutline, flameOutline } from 'ionicons/icons';
import { Fragment, useMemo, useState } from 'react';

import { StatusBadge } from '../components/Badges';
import Bar from '../components/Bar';
import SessionEditor, { type EditorRequest } from '../components/SessionEditor';
import SessionList from '../components/SessionList';
import { SPRINT_WEEK_GOAL_H, THEORY_TARGET, WEEK_GOAL_H } from '../data/program';
import { useNow } from '../hooks/useNow';
import {
  DAILY_GOAL_SEC,
  computeStreak,
  isValidated,
  lastNDays,
  ratioOf,
  totalsByDay,
  weekDays,
  type Ratio,
} from '../lib/stats';
import {
  addDays,
  formatDayLong,
  formatDayShort,
  formatDuration,
  formatHoursDecimal,
  todayKey,
  weekStart,
} from '../lib/time';
import { useStore } from '../state/AppStore';

const PAGE_SIZE = 30;

const RatioRow: React.FC<{ title: string; ratio: Ratio }> = ({ title, ratio }) => {
  const theoryPct = Math.round(ratio.theoryShare * 100);
  const delta = ratio.theoryShare - THEORY_TARGET;
  const verdict =
    ratio.total === 0
      ? 'Pas encore de données'
      : Math.abs(delta) <= 0.05
        ? 'Dans la cible 30 / 70'
        : delta > 0
          ? `Trop de théorie (+${Math.round(delta * 100)} pts)`
          : `Pas assez de théorie (${Math.round(delta * 100)} pts)`;
  return (
    <div className="ratio-row">
      <div className="ratio-head">
        <span>{title}</span>
        <span className="mono small">{ratio.total ? `${theoryPct} % / ${100 - theoryPct} %` : '—'}</span>
      </div>
      <Bar
        value={ratio.theoryShare}
        tone="theory"
        height={10}
        markers={[{ at: THEORY_TARGET, label: '30 %' }]}
        label={`Théorie ${theoryPct} %`}
      />
      <div className="ratio-legend small">
        <span className="legend-theory">Théorie {formatDuration(ratio.theory)}</span>
        <span className="legend-practice">Pratique {formatDuration(ratio.practice)}</span>
      </div>
      <p className={`ratio-verdict small ${ratio.total && Math.abs(delta) <= 0.05 ? 'ok' : ''}`}>{verdict}</p>
    </div>
  );
};

const Week: React.FC = () => {
  const { data, dispatch } = useStore();
  const { sessions, settings } = data;
  // Rafraîchit la date une fois par minute (passage de minuit).
  const now = useNow(true, 60_000);
  const today = todayKey(now);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [limitDays, setLimitDays] = useState(PAGE_SIZE);

  const byDay = useMemo(() => totalsByDay(sessions), [sessions]);
  const week = useMemo(() => weekDays(byDay, today, settings.sprintWeek), [byDay, today, settings.sprintWeek]);
  const last7 = useMemo(() => lastNDays(byDay, today, 7, settings.sprintWeek), [byDay, today, settings.sprintWeek]);
  const streak = useMemo(() => computeStreak(byDay, today, settings.sprintWeek), [byDay, today, settings.sprintWeek]);

  const monday = weekStart(today);
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.date >= monday && s.date <= today),
    [sessions, monday, today],
  );
  const weekRatio = useMemo(() => ratioOf(weekSessions), [weekSessions]);
  const allRatio = useMemo(() => ratioOf(sessions), [sessions]);

  const weekSec = week.reduce((acc, d) => acc + d.totals.total, 0);
  const goalH = settings.sprintWeek ? SPRINT_WEEK_GOAL_H : WEEK_GOAL_H;
  const scaleSec = Math.max(SPRINT_WEEK_GOAL_H * 3600, weekSec);
  const remainingSec = goalH * 3600 - weekSec;
  const validatedDays = week.filter((d) => isValidated(d.status)).length;

  const cutoff = addDays(today, -(limitDays - 1));
  const visibleSessions = sessions.filter((s) => s.date >= cutoff);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleSessions>();
    for (const s of visibleSessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return [...map.entries()];
  }, [visibleSessions]);
  const hasMore = sessions.some((s) => s.date < cutoff);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Semaine & Stats</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="page">
          {/* Cumul de la semaine */}
          <section className="card">
            <div className="card-head">
              <h2>Semaine du {formatDayShort(monday)}</h2>
              <span className="muted small">
                {validatedDays}/{settings.sprintWeek ? 6 : 5} jours à 3h
              </span>
            </div>
            <div className="week-total">
              <span className="mono big">{formatHoursDecimal(weekSec)}</span>
              <span className="muted"> / {goalH} h</span>
            </div>
            <Bar
              value={weekSec / scaleSec}
              tone={weekSec >= goalH * 3600 ? 'success' : 'primary'}
              height={12}
              label="Cumul de la semaine"
              markers={[
                { at: (WEEK_GOAL_H * 3600) / scaleSec, label: '15 h' },
                { at: (SPRINT_WEEK_GOAL_H * 3600) / scaleSec, label: '18 h' },
              ]}
            />
            <p className="muted small week-remaining">
              {remainingSec > 0
                ? `Reste ${formatDuration(remainingSec)} pour atteindre ${goalH} h.`
                : `Objectif ${goalH} h atteint (+${formatDuration(-remainingSec)}).`}
            </p>
            <div className="week-strip">
              {week.map((d) => (
                <div key={d.key} className={`week-day status-${d.status}${d.key === today ? ' is-today' : ''}`}>
                  <span className="small">{formatDayShort(d.key).split(' ')[0]}</span>
                  <IonIcon icon={isValidated(d.status) ? checkmarkCircle : ellipseOutline} />
                  <span className="mono tiny">{d.totals.total ? formatDuration(d.totals.total) : '—'}</span>
                </div>
              ))}
            </div>
          </section>

          <IonList inset className="form-list">
            <IonItem>
              <IonToggle
                checked={settings.sprintWeek}
                onIonChange={(e) => dispatch({ type: 'settings/update', patch: { sprintWeek: e.detail.checked } })}
              >
                Mode sprint <span className="muted">(6 jours · 18 h)</span>
              </IonToggle>
            </IonItem>
            <IonItem>
              <IonToggle
                checked={settings.sound}
                onIonChange={(e) => dispatch({ type: 'settings/update', patch: { sound: e.detail.checked } })}
              >
                Son de fin de bloc
              </IonToggle>
            </IonItem>
          </IonList>

          {/* Série */}
          <section className="card streak">
            <IonIcon icon={flameOutline} className="streak-icon" />
            <div>
              <div className="mono big">
                {streak.current} jour{streak.current > 1 ? 's' : ''}
              </div>
              <div className="muted small">
                Série en cours · record {streak.best} · les jours de repos ne cassent pas la série
              </div>
            </div>
          </section>

          {/* 7 derniers jours */}
          <section className="card">
            <div className="card-head">
              <h2>7 derniers jours</h2>
            </div>
            <div className="days">
              {last7.map((d) => (
                <div key={d.key} className={`day-row${d.key === today ? ' is-today' : ''}`}>
                  <div className="day-row-head">
                    <span className="day-name">
                      <IonIcon
                        icon={isValidated(d.status) ? checkmarkCircle : ellipseOutline}
                        className={isValidated(d.status) ? 'ok' : 'muted'}
                      />
                      {formatDayShort(d.key)}
                    </span>
                    <span className="day-right">
                      <span className="mono small">{formatDuration(d.totals.total)}</span>
                      <StatusBadge status={d.status} />
                    </span>
                  </div>
                  <Bar
                    value={d.totals.total / DAILY_GOAL_SEC}
                    tone={d.status === 'sprint' ? 'sprint' : d.status === 'validated' ? 'success' : 'primary'}
                    height={6}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Ratio théorie / pratique */}
          <section className="card">
            <div className="card-head">
              <h2>Théorie vs Pratique</h2>
              <span className="muted small">repère 30 % / 70 %</span>
            </div>
            <RatioRow title="Cette semaine" ratio={weekRatio} />
            <RatioRow title="Depuis le début" ratio={allRatio} />
          </section>

          {/* Sessions */}
          <div className="section-head">
            <h2>Sessions enregistrées</h2>
            <IonButton size="small" fill="outline" onClick={() => setEditor({ mode: 'add' })}>
              <IonIcon slot="start" icon={addOutline} />
              Ajout manuel
            </IonButton>
          </div>
          {grouped.length === 0 ? (
            <p className="empty">Aucune session sur cette période.</p>
          ) : (
            <p className="hint">Touche une session pour la modifier, glisse vers la gauche pour supprimer.</p>
          )}
          {grouped.map(([date, list]) => (
            <Fragment key={date}>
              <h3 className="group-title">
                {formatDayLong(date)}
                <span className="mono muted">{formatDuration(list.reduce((a, s) => a + s.durationSec, 0))}</span>
              </h3>
              <SessionList sessions={list} showHint={false} onEdit={(s) => setEditor({ mode: 'edit', session: s })} />
            </Fragment>
          ))}
          {hasMore && (
            <IonButton expand="block" fill="clear" onClick={() => setLimitDays((n) => n + PAGE_SIZE)}>
              Afficher {PAGE_SIZE} jours de plus
            </IonButton>
          )}
        </div>
        <SessionEditor request={editor} onDismiss={() => setEditor(null)} />
      </IonContent>
    </IonPage>
  );
};

export default Week;
