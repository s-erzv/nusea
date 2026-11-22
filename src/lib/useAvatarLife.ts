import { useEffect, useState, type RefObject } from "react";

export type AvatarMood = "idle" | "happy" | "wow" | "sleepy";

export function usePointerLook(enabled: boolean, ref: RefObject<SVGSVGElement | null>) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [lastMove, setLastMove] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    function onMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height * 0.42);
        const nx = Math.abs(dx) < rect.width * 0.25 ? 0 : Math.sign(dx);
        const ny = dy > rect.height * 0.35 ? 1 : 0;
        setLook((current) =>
          current.x === nx && current.y === ny ? current : { x: nx, y: ny },
        );
        setLastMove(Date.now());
      });
    }
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [enabled, ref]);

  return { look, lastMove };
}

export function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    function schedule() {
      timer = window.setTimeout(() => {
        setClosed(true);
        timer = window.setTimeout(() => {
          setClosed(false);
          schedule();
        }, 140);
      }, 2200 + Math.random() * 2800);
    }
    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return closed;
}

export function useIdleSleep(enabled: boolean, lastMove: number) {
  const [sleepy, setSleepy] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    setSleepy(false);
    const timer = window.setTimeout(() => setSleepy(true), 18000);
    return () => window.clearTimeout(timer);
  }, [enabled, lastMove]);
  return sleepy;
}
