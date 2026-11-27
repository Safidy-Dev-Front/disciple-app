interface Marker {
  /** Position 0–1 sur la barre. */
  at: number;
  label: string;
}

interface Props {
  /** 0–1 */
  value: number;
  tone?: 'primary' | 'success' | 'sprint' | 'muted' | 'theory';
  markers?: Marker[];
  height?: number;
  label?: string;
}

/** Barre de progression en CSS pur (pas de composant lourd, pas d'animation). */
const Bar: React.FC<Props> = ({ value, tone = 'primary', markers = [], height = 8, label }) => (
  <div
    className={`bar bar-track-${tone}`}
    style={{ height }}
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(Math.min(1, value) * 100)}
  >
    <div className={`bar-fill bar-${tone}`} style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
    {markers.map((m) => (
      <div key={m.label} className="bar-marker" style={{ left: `${m.at * 100}%` }}>
        <span>{m.label}</span>
      </div>
    ))}
  </div>
);

export default Bar;
