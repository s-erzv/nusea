import { useRef } from "react";
import { useBlink, useIdleSleep, usePointerLook } from "../lib/useAvatarLife";
import { parseAvatar, type AvatarConfig, type GlassesStyle } from "../../shared/avatar";

import type { AvatarMood } from "../lib/useAvatarLife";

export type { AvatarMood };

interface PixelAvatarProps {
  size?: "hero" | "small";
  value?: string;
  /** Eyes follow the pointer, blinks, and reacts to mood changes. */
  interactive?: boolean;
  mood?: AvatarMood;
  waving?: boolean;
}

const OUTLINE = "#14213d";
const BLUSH = "#ff7b9c";

function Px({ x, y, w = 1, h = 1, fill, opacity }: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill: string;
  opacity?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />;
}

type Row = readonly [y: number, x0: number, x1: number];

function Rows({ rows, fill, opacity }: { rows: readonly Row[]; fill: string; opacity?: number }) {
  return (
    <g fill={fill} opacity={opacity}>
      {rows.map(([y, x0, x1]) => (
        <rect key={`${y}-${x0}`} x={x0} y={y} width={x1 - x0 + 1} height={1} />
      ))}
    </g>
  );
}

// Head + drape silhouette (outline) and its fill, inset by one pixel.
const HIJAB_OUTLINE: Row[] = [
  [3, 11, 20], [4, 9, 22], [5, 7, 24], [6, 6, 25], [7, 6, 25],
  ...Array.from({ length: 16 }, (_, i): Row => [8 + i, 5, 26]),
  [24, 6, 25], [25, 7, 24], [26, 9, 22], [27, 11, 20], [28, 13, 18],
];
const HIJAB_FILL: Row[] = [
  [4, 11, 20], [5, 9, 22], [6, 7, 24], [7, 7, 24],
  ...Array.from({ length: 16 }, (_, i): Row => [8 + i, 6, 25]),
  [24, 7, 24], [25, 8, 23], [26, 10, 21], [27, 12, 19],
];
const FACE: Row[] = [
  [10, 10, 21],
  ...Array.from({ length: 8 }, (_, i): Row => [11 + i, 9, 22]),
  [19, 10, 21], [20, 11, 20], [21, 12, 19],
];

/** Thin vector glasses drawn over the pixel face (lenses around x 9.5–14.5 / 17.5–22.5). */
function Glasses({ style }: { style: GlassesStyle }) {
  if (style === "none") return null;
  const width = style === "bold" ? 0.8 : 0.5;
  const rx = style === "rect" ? 0.3 : style === "halfrim" ? 0.6 : 1.4;
  return (
    <g
      fill="none"
      stroke={OUTLINE}
      strokeWidth={width}
      strokeLinecap="round"
      shapeRendering="geometricPrecision"
    >
      {style === "halfrim" ? (
        <path d="M9.6 13.6h5M17.4 13.6h5M9.6 13.6v1.6M14.6 13.6v1.6M17.4 13.6v1.6M22.4 13.6v1.6" />
      ) : (
        <>
          <rect x={9.6} y={13.4} width={5} height={4.4} rx={rx} fill="#ffffff" fillOpacity={0.12} />
          <rect x={17.4} y={13.4} width={5} height={4.4} rx={rx} fill="#ffffff" fillOpacity={0.12} />
        </>
      )}
      <path d="M14.6 15.2q1.4 -0.8 2.8 0" />
    </g>
  );
}

function Eyes({ closed, mood }: { closed: boolean; mood: AvatarMood }) {
  if (closed || mood === "sleepy") {
    // soft "u" shaped closed eyes
    return (
      <g fill={OUTLINE}>
        <rect x={10} y={16} width={1} height={1} />
        <rect x={11} y={17} width={2} height={1} />
        <rect x={13} y={16} width={1} height={1} />
        <rect x={18} y={16} width={1} height={1} />
        <rect x={19} y={17} width={2} height={1} />
        <rect x={21} y={16} width={1} height={1} />
      </g>
    );
  }
  if (mood === "happy") {
    return (
      <g fill={OUTLINE}>
        <rect x={10} y={16} width={1} height={1} />
        <rect x={11} y={15} width={2} height={1} />
        <rect x={13} y={16} width={1} height={1} />
        <rect x={18} y={16} width={1} height={1} />
        <rect x={19} y={15} width={2} height={1} />
        <rect x={21} y={16} width={1} height={1} />
      </g>
    );
  }
  const top = mood === "wow" ? 13 : 14;
  const tall = mood === "wow" ? 4 : 3;
  return (
    <g>
      <Px x={11} y={top} w={2} h={tall} fill={OUTLINE} />
      <Px x={19} y={top} w={2} h={tall} fill={OUTLINE} />
      <Px x={11} y={top} fill="#ffffff" />
      <Px x={19} y={top} fill="#ffffff" />
      <Px x={12} y={top + tall - 1} fill="#ffffff" opacity={0.35} />
      <Px x={20} y={top + tall - 1} fill="#ffffff" opacity={0.35} />
    </g>
  );
}

function Mouth({ mood }: { mood: AvatarMood }) {
  const lip = "#9a3b3b";
  if (mood === "wow") {
    return <Px x={15} y={19} w={2} h={1} fill={lip} />;
  }
  if (mood === "happy") {
    return (
      <g>
        <Px x={14} y={19} w={4} fill={lip} />
        <Px x={15} y={20} w={2} fill="#ff8f8f" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return <Px x={15} y={20} w={2} fill={lip} opacity={0.7} />;
  }
  return (
    <g fill={lip}>
      <rect x={14} y={19} width={1} height={1} />
      <rect x={15} y={20} width={2} height={1} />
      <rect x={17} y={19} width={1} height={1} />
    </g>
  );
}

function Figure({ config }: { config: AvatarConfig }) {
  const { hijab, hijabDark, shirt, skin, accent } = config;
  return (
    <g>
      <Px x={5} y={31} w={22} fill="var(--shadow)" opacity={0.25} />

      {/* shoulders */}
      <Px x={3} y={25} w={26} h={6} fill={OUTLINE} />
      <Px x={4} y={25} w={24} h={6} fill={shirt} />
      <Px x={4} y={29} w={24} h={2} fill={OUTLINE} opacity={0.12} />

      <Rows rows={HIJAB_OUTLINE} fill={OUTLINE} />
      <Rows rows={HIJAB_FILL} fill={hijab} />
      {/* shading + highlight */}
      <Px x={24} y={7} w={1} h={2} fill={hijabDark} />
      <Px x={24} y={9} w={2} h={14} fill={hijabDark} />
      <Px x={21} y={24} w={3} h={2} fill={hijabDark} />
      <Px x={12} y={22} w={8} fill={hijabDark} />
      <Px x={11} y={4} w={4} fill="#ffffff" opacity={0.35} />
      <Px x={8} y={6} w={2} fill="#ffffff" opacity={0.35} />
      <Px x={6} y={9} h={4} fill="#ffffff" opacity={0.22} />

      {/* face */}
      <Rows rows={FACE} fill={skin} />
      <Px x={22} y={12} h={6} fill={OUTLINE} opacity={0.08} />
      {/* inner cap */}
      <Px x={10} y={10} w={12} fill={hijabDark} />
      <Px x={11} y={10} w={3} fill={accent} />

      {/* brooch */}
      <Px x={20} y={23} w={2} h={2} fill={accent} />
      <Px x={20} y={23} fill="#ffffff" opacity={0.7} />

      {/* lab ID card */}
      <Px x={23} y={26} h={2} fill={accent} />
      <Px x={22} y={27} w={4} h={4} fill={OUTLINE} />
      <Px x={23} y={28} w={2} h={2} fill="#ffffff" />
      <Px x={23} y={28} fill={hijab} />
    </g>
  );
}

function Sparkles({ accent, hijab }: { accent: string; hijab: string }) {
  return (
    <g className="avatar-sparkles">
      <Px x={2} y={5} h={3} fill={accent} />
      <Px x={1} y={6} w={3} fill={accent} />
      <Px x={28} y={4} fill={accent} />
      <Px x={29} y={3} fill={hijab} />
      <Px x={1} y={2} fill={hijab} />
      <Px x={2} y={18} fill={hijab} />
      <Px x={29} y={17} fill={accent} />
      <Px x={30} y={11} fill={hijab} />
    </g>
  );
}

export function PixelAvatar({
  size = "hero",
  value,
  interactive = false,
  mood = "idle",
  waving = false,
}: PixelAvatarProps) {
  const ref = useRef<SVGSVGElement>(null);
  const { look, lastMove } = usePointerLook(interactive, ref);
  const blink = useBlink(interactive);
  const sleepy = useIdleSleep(interactive, lastMove);
  const dimension = size === "hero" ? "w-full max-w-[340px]" : "w-20";
  const avatar = parseAvatar(value);

  if (avatar.kind === "image") {
    return (
      <img
        src={avatar.url}
        alt="Nusea researcher avatar"
        className={`sprite ${dimension} aspect-square border-[3px] border-line object-cover`}
      />
    );
  }

  const { config } = avatar;
  const effectiveMood: AvatarMood = mood === "idle" && sleepy ? "sleepy" : mood;

  return (
    <svg
      ref={ref}
      role="img"
      aria-label="Pixel avatar of the Nusea researcher wearing a hijab and glasses"
      viewBox="0 0 32 32"
      className={`sprite ${dimension} ${interactive ? "avatar-breathe" : ""}`}
      shapeRendering="crispEdges"
    >
      <Sparkles accent={config.accent} hijab={config.hijab} />
      <g
        style={{
          transform: `rotate(${look.x * 3}deg) translateY(${look.y * 0.5}px)`,
          transformOrigin: "16px 30px",
          transformBox: "view-box",
          transition: "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
      <Figure config={config} />

      <Eyes closed={blink} mood={effectiveMood} />
      <Glasses style={config.glasses} />

      {/* blush */}
      <g opacity={effectiveMood === "happy" || effectiveMood === "wow" ? 0.85 : 0.5}>
        <Px x={10} y={19} w={2} fill={BLUSH} />
        <Px x={20} y={19} w={2} fill={BLUSH} />
      </g>

      <Mouth mood={effectiveMood} />
      </g>

      {waving ? (
        <g className="avatar-wave">
          <Px x={26} y={14} w={4} h={4} fill={OUTLINE} />
          <Px x={27} y={15} w={2} h={2} fill={config.skin} />
          <Px x={26} y={18} w={3} h={7} fill={OUTLINE} />
          <Px x={27} y={18} w={1} h={7} fill={config.shirt} />
        </g>
      ) : null}

      {effectiveMood === "sleepy" ? (
        <g className="avatar-zzz">
          <Px x={27} y={3} w={3} fill="var(--ink)" />
          <Px x={28} y={4} fill="var(--ink)" />
          <Px x={27} y={5} w={3} fill="var(--ink)" />
          <Px x={30} y={0} w={2} fill="var(--ink)" opacity={0.6} />
          <Px x={31} y={1} fill="var(--ink)" opacity={0.6} />
          <Px x={30} y={2} w={2} fill="var(--ink)" opacity={0.6} />
        </g>
      ) : null}
    </svg>
  );
}
