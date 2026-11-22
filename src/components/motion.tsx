import type { ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { useRef } from "react";

/** Fades/slides children in once they enter the viewport. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts up from 0 the first time it scrolls into view. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <span ref={ref} className={className}>
      <NumberFlow value={inView ? value : 0} />
    </span>
  );
}

/** Thin striped bar at the top of the viewport showing scroll progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      className="scroll-progress fixed inset-x-0 top-0 z-50 h-1 origin-left"
      style={{ scaleX }}
    />
  );
}
