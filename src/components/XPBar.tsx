interface XPBarProps {
  value: number;
  label?: string;
  animate?: boolean;
}

export function XPBar({ value, label = "Research progress", animate = true }: XPBarProps) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="xp-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
    >
      <div
        className={animate ? "xp-fill xp-fill-anim" : "xp-fill"}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
