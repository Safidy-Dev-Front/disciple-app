import { useAlert } from '../components/NotificationCenter';
import { CATEGORY_BY_ID, DAILY_GOAL_MIN, GUIDED_BLOCKS } from '../data/program';
import { useNow } from '../hooks/useNow';
import { formatHMS } from '../lib/time';
import { elapsedMs, guidedPosition } from '../lib/timer';
import { useStore } from '../state/AppStore';
import { todayTotalMs } from '../state/reminders';

const GOAL_MS = DAILY_GOAL_MIN * 60_000;

/**
 * Contenu du mini-minuteur, rendu par portail React dans la fenêtre flottante.
 * HTML simple (pas de composants Ionic : leurs web components ne sont pas
 * enregistrés dans le document de la fenêtre flottante).
 */
const MiniTimerView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data, dispatch } = useStore();
  const { alert, dismiss } = useAlert();
  const { timer } = data;
  const running = timer.status === 'running';
  const now = useNow(true, running ? 1000 : 15_000);

  const elapsed = elapsedMs(timer, now);
  const dayMs = todayTotalMs(data, now);
  const dayRatio = Math.min(1, dayMs / GOAL_MS);

  let detail = '';
  if (timer.status !== 'idle' && timer.guided) {
    const pos = guidedPosition(elapsed);
    detail =
      pos.index < GUIDED_BLOCKS.length
        ? `${GUIDED_BLOCKS[pos.index].title} · reste ${formatHMS(pos.blockRemainingMs)}`
        : 'Session guidée terminée';
  } else if (timer.status !== 'idle' && timer.targetMin !== null) {
    const left = timer.targetMin * 60_000 - elapsed;
    detail = left > 0 ? `Minuteur ${timer.targetMin} min · reste ${formatHMS(left)}` : 'Minuteur écoulé';
  }

  const t = Date.now;
  return (
    <div className={`mini mini-${timer.status}${alert ? ' has-alert' : ''}`}>
      {alert ? (
        <div className={`mini-alert mini-alert-${alert.kind}`} role="alert">
          <strong>{alert.title}</strong>
          <span>{alert.body}</span>
          <button type="button" onClick={dismiss}>
            OK
          </button>
        </div>
      ) : (
        <>
          <div className="mini-head">
            <span className="mini-dot">{running ? 'En cours' : timer.status === 'paused' ? 'En pause' : 'Prêt'}</span>
            <span className="mini-cat">{CATEGORY_BY_ID[timer.categoryId].label}</span>
          </div>
          <div className="mini-time">{formatHMS(elapsed)}</div>
          <div className="mini-detail">{detail || ' '}</div>
          <div className="mini-day">
            <div className="mini-bar">
              <div className={dayRatio >= 1 ? 'ok' : ''} style={{ width: `${dayRatio * 100}%` }} />
            </div>
            <span>{formatHMS(dayMs)} / 03:00:00</span>
          </div>
          <div className="mini-actions">
            {timer.status === 'idle' && (
              <button type="button" className="primary" onClick={() => dispatch({ type: 'timer/start', now: t() })}>
                ▶ Démarrer
              </button>
            )}
            {running && (
              <button type="button" onClick={() => dispatch({ type: 'timer/pause', now: t() })}>
                ❚❚ Pause
              </button>
            )}
            {timer.status === 'paused' && (
              <button type="button" className="primary" onClick={() => dispatch({ type: 'timer/resume', now: t() })}>
                ▶ Reprendre
              </button>
            )}
            <button type="button" className="ghost" onClick={onClose} aria-label="Fermer le mini-minuteur">
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MiniTimerView;
