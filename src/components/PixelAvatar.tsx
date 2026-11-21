import { parseAvatar, type GlassesStyle } from "../../shared/avatar";

interface PixelAvatarProps {
  size?: "hero" | "small";
  value?: string;
}

function AvatarGlasses({ style }: { style: GlassesStyle }) {
  if (style === "none") return null;
  if (style === "halfrim") {
    return (
      <g
        fill="none"
        stroke="#0f172a"
        strokeWidth="0.55"
        strokeLinecap="round"
        shapeRendering="geometricPrecision"
      >
        <path d="M7.7 8.1h4.5M12.8 8.1h4.5M7.7 8.1v1.5M17.3 8.1v1.5M12.3 8.5h.4M7.7 9.3H6.4M17.3 9.3h1.3" />
      </g>
    );
  }
  const bold = style === "bold";
  const round = style === "round";
  return (
    <g
      fill="none"
      stroke="#0f172a"
      strokeWidth={bold ? 0.85 : 0.5}
      strokeLinecap="round"
      shapeRendering="geometricPrecision"
    >
      <rect x="7.7" y="7.7" width="4.6" height="3.6" rx={round ? 1.1 : 0.15} />
      <rect x="12.7" y="7.7" width="4.6" height="3.6" rx={round ? 1.1 : 0.15} />
      <path d="M12.3 8.9h0.4" />
      <path d="M7.7 9.1H6.4" />
      <path d="M17.3 9.1h1.3" />
    </g>
  );
}

export function PixelAvatar({ size = "hero", value }: PixelAvatarProps) {
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

  return (
    <svg
      role="img"
      aria-label="Pixel avatar of the Nusea researcher wearing a hijab and glasses"
      viewBox="0 0 24 24"
      className={`sprite ${dimension}`}
      shapeRendering="crispEdges"
    >
      <rect x="3" y="23" width="18" height="1" fill="var(--shadow)" opacity="0.25" />

      <rect x="5" y="18" width="14" height="4" fill="#14213d" />
      <rect x="6" y="18" width="12" height="4" fill={config.shirt} />
      <rect x="12" y="18" width="1" height="4" fill="#cbd5e1" />
      <rect x="16" y="21" width="1" height="1" fill={config.accent} />
      <rect x="6" y="16" width="12" height="2" fill="#14213d" />

      <rect x="3" y="14" width="18" height="6" fill={config.hijab} />
      <rect x="4" y="20" width="2" height="1" fill={config.hijab} />
      <rect x="18" y="20" width="2" height="1" fill={config.hijab} />
      <rect x="4" y="4" width="16" height="10" fill={config.hijab} />
      <rect x="8" y="3" width="8" height="1" fill={config.hijab} />
      <rect x="5" y="3" width="3" height="1" fill={config.hijabDark} />
      <rect x="16" y="3" width="3" height="1" fill={config.hijabDark} />
      <rect x="4" y="5" width="1" height="9" fill={config.hijabDark} />
      <rect x="19" y="5" width="1" height="9" fill={config.hijabDark} />
      <rect x="5" y="5" width="4" height="1" fill={config.accent} />

      <rect x="7" y="7" width="10" height="6" fill={config.skin} />
      <rect x="8" y="13" width="8" height="1" fill={config.skin} />

      <g className="avatar-blink">
        <rect x="9" y="9" width="1" height="1" fill="#14213d" />
        <rect x="14" y="9" width="1" height="1" fill="#14213d" />
      </g>

      <AvatarGlasses style={config.glasses} />

      <rect x="11" y="12" width="2" height="1" fill="#a85b47" />

      <rect x="18" y="13" width="1" height="1" fill={config.accent} />
      <rect x="2" y="6" width="1" height="2" fill={config.accent} />
      <rect x="21" y="4" width="1" height="1" fill={config.accent} />
      <rect x="22" y="3" width="1" height="1" fill={config.hijab} />
      <rect x="1" y="3" width="1" height="1" fill={config.hijab} />
      <rect x="1" y="16" width="1" height="1" fill={config.hijab} />
      <rect x="21" y="18" width="1" height="1" fill={config.accent} />
    </svg>
  );
}
