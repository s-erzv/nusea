interface PixelAvatarProps {
  size?: "hero" | "small";
}

export function PixelAvatar({ size = "hero" }: PixelAvatarProps) {
  const dimension = size === "hero" ? "w-full max-w-[340px]" : "w-20";
  return (
    <svg
      role="img"
      aria-label="Avatar pixel peneliti Nuza"
      viewBox="0 0 18 18"
      className={`sprite ${dimension}`}
      shapeRendering="crispEdges"
    >
      <rect x="2" y="17" width="14" height="1" fill="var(--shadow)" opacity="0.25" />
      <rect x="4" y="14" width="10" height="3" fill="#14213d" />
      <rect x="5" y="14" width="8" height="3" fill="var(--orange)" />
      <rect x="8" y="14" width="2" height="3" fill="var(--yellow)" />
      <rect x="3" y="15" width="1" height="2" fill="var(--card)" />
      <rect x="14" y="15" width="1" height="2" fill="var(--card)" />
      <rect x="5" y="12" width="8" height="2" fill="#14213d" />
      <rect x="6" y="12" width="6" height="2" fill="#f0c49a" />
      <rect x="4" y="3" width="10" height="10" fill="#14213d" />
      <rect x="5" y="3" width="8" height="2" fill="#14213d" />
      <rect x="3" y="4" width="1" height="6" fill="#14213d" />
      <rect x="14" y="4" width="1" height="6" fill="#14213d" />
      <rect x="5" y="5" width="8" height="7" fill="#f0c49a" />
      <rect x="6" y="4" width="6" height="1" fill="#14213d" />
      <rect x="5" y="6" width="1" height="2" fill="#14213d" />
      <rect x="12" y="6" width="1" height="2" fill="#14213d" />
      <rect x="6" y="7" width="2" height="1" fill="var(--yellow)" />
      <rect x="10" y="7" width="2" height="1" fill="var(--yellow)" />
      <rect x="8" y="7" width="2" height="1" fill="#14213d" />
      <rect x="6" y="8" width="6" height="1" fill="#14213d" />
      <g className="avatar-blink">
        <rect x="6" y="9" width="1" height="1" fill="#14213d" />
        <rect x="11" y="9" width="1" height="1" fill="#14213d" />
        <rect x="7" y="10" width="4" height="1" fill="#a85b47" />
      </g>
      <rect x="4" y="11" width="1" height="1" fill="#14213d" />
      <rect x="13" y="11" width="1" height="1" fill="#14213d" />
      <rect x="1" y="4" width="1" height="2" fill="var(--yellow)" />
      <rect x="15" y="3" width="1" height="1" fill="var(--yellow)" />
      <rect x="16" y="2" width="1" height="1" fill="var(--orange)" />
      <rect x="2" y="2" width="1" height="1" fill="var(--orange)" />
      <rect x="1" y="12" width="1" height="1" fill="var(--orange)" />
      <rect x="16" y="13" width="1" height="1" fill="var(--yellow)" />
    </svg>
  );
}
