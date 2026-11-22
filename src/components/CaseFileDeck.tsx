import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import Tilt from "react-parallax-tilt";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { ITEM_TYPE_LABELS, STATUS_LABELS } from "../../shared/constants";
import { hasPublicField, type PublicItem } from "../../shared/public-schemas";
import { excerpt, statusProgress } from "../lib/format";
import { SwipeCards, type SwipeCardsHandle } from "./hantui/swipe-cards";
import { XPBar } from "./XPBar";

interface CaseFileDeckProps {
  items: PublicItem[];
  status: string;
  clock: string;
}

const PALETTE = ["#ff8a2b", "#ffd93d", "#bee3ff", "#14213d", "#ffffff"];
const CARD_TONES = ["bg-card", "bg-paper", "bg-card", "bg-paper", "bg-card"];

/** Retro "window" holding a swipeable stack of the latest research files. */
export function CaseFileDeck({ items, status, clock }: CaseFileDeckProps) {
  const reduceMotion = useReducedMotion();
  const deckRef = useRef<SwipeCardsHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState(0);

  function handleSwipe() {
    const next = seen + 1;
    setSeen(next);
    if (next < items.length || reduceMotion) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    void confetti({
      particleCount: 90,
      spread: 90,
      startVelocity: 30,
      ticks: 120,
      shapes: ["square"],
      colors: PALETTE,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      disableForReducedMotion: true,
    });
  }

  function reshuffle() {
    setRound((value) => value + 1);
    setSeen(0);
  }

  const done = seen >= items.length;

  return (
    <div ref={rootRef}>
      <Tilt
        tiltMaxAngleX={6}
        tiltMaxAngleY={6}
        perspective={1000}
        glareEnable
        glareMaxOpacity={0.14}
        glareColor="#ffd93d"
        glarePosition="all"
        tiltEnable={!reduceMotion}
        className="pixel-card-lg relative overflow-hidden"
      >
        <div className="flex items-center justify-between border-b-[3px] border-line bg-ink px-3 py-1.5 text-card">
          <span className="font-pixel text-[10px] uppercase tracking-[0.12em]">case-files.exe</span>
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-2.5 w-2.5 border border-card bg-orange" />
            <span className="h-2.5 w-2.5 border border-card bg-yellow" />
            <span className="h-2.5 w-2.5 border border-card bg-success" />
          </span>
        </div>

        <div className="avatar-stage px-5 pb-8 pt-5">
          <div className="mb-3 flex items-center justify-between font-pixel text-[10px] uppercase text-muted">
            <span>Latest research</span>
            <span>
              {Math.min(seen + 1, items.length)}/{items.length}
            </span>
          </div>
          <SwipeCards
            key={round}
            ref={deckRef}
            aria-label="Latest research files"
            className="h-[250px]"
            items={items}
            getKey={(item) => item.id}
            getLabel={(item) => item.title}
            threshold={90}
            onSwipe={handleSwipe}
            labels={{
              left: <span className="pixel-badge" data-tone="muted">NEXT</span>,
              right: <span className="pixel-badge" data-tone="pinned">NEXT</span>,
            }}
            empty={
              <div className="text-center">
                <p className="font-pixel text-[12px] uppercase">All caught up ✦</p>
                <button type="button" className="pixel-btn pixel-btn-small mt-3" onClick={reshuffle}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> SHUFFLE AGAIN
                </button>
              </div>
            }
            renderCard={(item) => {
              const index = items.indexOf(item);
              const progress = item.progress ?? statusProgress(item.status);
              return (
                <div
                  className={`relative flex h-full select-none flex-col border-[3px] border-line p-4 text-left shadow-hard ${CARD_TONES[index % CARD_TONES.length]}`}
                >
                  <span className="tape" aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pixel-badge">{STATUS_LABELS[item.status]}</span>
                    <span className="font-pixel text-[9px] uppercase text-muted">
                      {ITEM_TYPE_LABELS[item.type]}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[17px] font-semibold leading-snug">{item.title}</p>
                  {hasPublicField(item, "abstract") && item.abstract ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted">
                      {excerpt(item.abstract, 140)}
                    </p>
                  ) : null}
                  <div className="mt-auto">
                    {hasPublicField(item, "progress") ? (
                      <div className="mb-2">
                        <div className="mb-1 flex justify-between font-pixel text-[9px] uppercase text-muted">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <XPBar value={progress} label={`Research progress: ${item.title}`} animate={false} />
                      </div>
                    ) : null}
                    <Link
                      to={`/research/${item.id}`}
                      className="inline-flex items-center gap-1 font-pixel text-[11px] text-orange hover:underline"
                    >
                      OPEN FILE <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            }}
          />
        </div>

        <div className="flex items-center gap-2 border-t-[3px] border-line bg-card px-3 py-2">
          <button
            type="button"
            className="pixel-btn pixel-btn-ghost pixel-btn-small w-10 px-0"
            onClick={() => deckRef.current?.swipe("left")}
            disabled={done}
            aria-label="Skip to the next file"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
            &gt; {status}
            <span className="blink" aria-hidden="true">_</span>
          </p>
          <span className="hidden font-mono text-[11px] text-muted sm:inline">{clock} WIB</span>
          <button
            type="button"
            className="pixel-btn pixel-btn-small w-10 px-0"
            onClick={() => deckRef.current?.swipe("right")}
            disabled={done}
            aria-label="Swipe to the next file"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </Tilt>
      <p className="mt-2 text-center font-pixel text-[9px] uppercase text-muted">
        drag the card or use ← → keys
      </p>
    </div>
  );
}
