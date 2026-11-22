import type { Transition, Variants } from "motion/react";

/** Durations in seconds. */
export const duration = {
  instant: 0.1,
  quick: 0.18,
  base: 0.28,
  slow: 0.45,
} as const;

/** Cubic-bezier curves. */
export const ease = {
  /** Entering, UI response. */
  out: [0.22, 1, 0.36, 1],
  /** Moving on screen. */
  inOut: [0.65, 0, 0.35, 1],
  /** Sheets and the mobile menu. */
  drawer: [0.32, 0.72, 0, 1],
} as const;

/** Everyday UI: presses, icon swaps, popovers and modals. Exits run at `exitFactor` of the enter. */
export const ui = {
  press: { scale: 0.96, duration: 0.12 },
  icon: { type: "spring", duration: 0.3, bounce: 0 },
  popover: { duration: 0.18, ease: ease.out },
  modal: { duration: 0.24, ease: ease.out },
  exitFactor: 0.6,
} as const;

/** Once-per-visit motion on the landing page: hero letters, the reel and the afterimage. */
export const kinetic = {
  heroLetter: { duration: 0.6, ease: ease.out },
  /** Delay per letter, eased so the wave slows toward the end. */
  heroStep: 0.035,
  reelSwap: { type: "spring", duration: 0.5, bounce: 0.1 },
  /** Two afterimages: lag in seconds and opacity of each. */
  ghost: { lag: [0.04, 0.09], opacity: [0.14, 0.06] },
} as const;

/** Spring presets. */
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  smooth: { type: "spring", stiffness: 260, damping: 26 },
  bouncy: { type: "spring", stiffness: 300, damping: 15 },
} as const satisfies Record<string, Transition>;

/** Stagger between siblings, in seconds (0.03–0.06). */
export const stagger = {
  tight: 0.03,
  base: 0.045,
  loose: 0.06,
} as const;

/** Blur + fade + y-offset. Falls back to a plain fade under reduced motion. */
export function enterVariants(reduceMotion?: boolean | null, y = 8): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: duration.base } },
      exit: { opacity: 0, transition: { duration: duration.quick } },
    };
  }
  return {
    hidden: { opacity: 0, y, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: duration.base, ease: ease.out },
    },
    exit: {
      opacity: 0,
      y: -y / 2,
      filter: "blur(4px)",
      transition: { duration: duration.quick, ease: ease.out },
    },
  };
}

/** Scale 0.96 → 1 for popovers, menus and dialogs. */
export function overlayVariants(reduceMotion?: boolean | null): Variants {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: duration.quick } },
      exit: { opacity: 0, transition: { duration: duration.instant } },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.96, filter: "blur(2px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: duration.quick, ease: ease.out },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      filter: "blur(2px)",
      transition: { duration: duration.instant + 0.02, ease: ease.out },
    },
  };
}

/** Parent variants that stagger their children in. */
export function staggerVariants(gap: number = stagger.base, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: gap, delayChildren } },
    exit: { transition: { staggerChildren: gap / 2, staggerDirection: -1 } },
  };
}
