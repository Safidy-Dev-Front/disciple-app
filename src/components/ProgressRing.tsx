interface Props {
  /** 0–1 (peut dépasser 1 : l'anneau reste plein). */
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'primary' | 'success' | 'sprint';
  children?: React.ReactNode;
}

/** Anneau SVG statique : aucune animation continue, coût GPU négligeable. */
const ProgressRing: React.FC<Props> = ({ value, size = 220, stroke = 10, tone = 'primary', children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ring-value ring-${tone}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
};

export default ProgressRing;
