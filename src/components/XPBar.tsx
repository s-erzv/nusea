import { motion } from "motion/react";

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
      {animate ? (
        <motion.div
          className="xp-fill"
          initial={{ width: "0%" }}
          whileInView={{ width: `${safe}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      ) : (
        <div className="xp-fill" style={{ width: `${safe}%` }} />
      )}
    </div>
  );
}
