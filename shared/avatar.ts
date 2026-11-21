export const GLASSES_STYLES = [
  "none",
  "round",
  "rect",
  "halfrim",
  "bold",
] as const;

export type GlassesStyle = (typeof GLASSES_STYLES)[number];

export const GLASSES_LABELS: Record<GlassesStyle, string> = {
  none: "No glasses",
  round: "Round",
  rect: "Rectangular",
  halfrim: "Half-rim",
  bold: "Bold",
};

export interface AvatarConfig {
  hijab: string;
  hijabDark: string;
  shirt: string;
  skin: string;
  accent: string;
  glasses: GlassesStyle;
}

export interface AvatarPreset {
  id: string;
  label: string;
  config: AvatarConfig;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  hijab: "#ff8a2b",
  hijabDark: "#b45309",
  shirt: "#f8fafc",
  skin: "#f0c49a",
  accent: "#ffd93d",
  glasses: "round",
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "nusea", label: "Nusea original", config: DEFAULT_AVATAR },
  {
    id: "mint",
    label: "Mint lab",
    config: {
      hijab: "#5cc9ae",
      hijabDark: "#2f8f78",
      shirt: "#1f6f5b",
      skin: "#f0c49a",
      accent: "#ffe066",
      glasses: "round",
    },
  },
  {
    id: "violet",
    label: "Violet night",
    config: {
      hijab: "#a78bfa",
      hijabDark: "#7c5cf0",
      shirt: "#5b3fd1",
      skin: "#f3c9a3",
      accent: "#f9a8d4",
      glasses: "round",
    },
  },
  {
    id: "rose",
    label: "Rose pixel",
    config: {
      hijab: "#f472b6",
      hijabDark: "#be3d82",
      shirt: "#9d2765",
      skin: "#f7d0b0",
      accent: "#fde68a",
      glasses: "round",
    },
  },
  {
    id: "slate",
    label: "Slate mono",
    config: {
      hijab: "#94a3b8",
      hijabDark: "#64748b",
      shirt: "#334155",
      skin: "#e2e8f0",
      accent: "#fbbf24",
      glasses: "round",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    config: {
      hijab: "#fb923c",
      hijabDark: "#c2410c",
      shirt: "#9a3412",
      skin: "#f3c9a3",
      accent: "#fde047",
      glasses: "round",
    },
  },
];

export type ParsedAvatar =
  | { kind: "image"; url: string }
  | { kind: "pixel"; config: AvatarConfig; presetId: string | null };

function isColor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length < 80;
}

function normalizeGlasses(value: unknown): GlassesStyle {
  if (value === false) return "none";
  if (typeof value === "string" && (GLASSES_STYLES as readonly string[]).includes(value)) {
    return value as GlassesStyle;
  }
  return "round";
}

function asConfig(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    !isColor(record.hijab) ||
    !isColor(record.hijabDark) ||
    !isColor(record.shirt) ||
    !isColor(record.skin) ||
    !isColor(record.accent)
  ) {
    return null;
  }
  return {
    hijab: record.hijab,
    hijabDark: record.hijabDark,
    shirt: record.shirt,
    skin: record.skin,
    accent: record.accent,
    glasses: normalizeGlasses(record.glasses),
  };
}

function matchPreset(config: AvatarConfig): string | null {
  const preset = AVATAR_PRESETS.find(
    (entry) =>
      entry.config.hijab === config.hijab &&
      entry.config.hijabDark === config.hijabDark &&
      entry.config.shirt === config.shirt &&
      entry.config.skin === config.skin &&
      entry.config.accent === config.accent &&
      entry.config.glasses === config.glasses,
  );
  return preset?.id ?? null;
}

export function parseAvatar(value?: string): ParsedAvatar {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return { kind: "pixel", config: DEFAULT_AVATAR, presetId: "nusea" };
  }
  if (/^(https?:\/\/|\/|data:image\/)/i.test(raw)) {
    return { kind: "image", url: raw };
  }
  if (raw === "nusea-pixel") {
    return { kind: "pixel", config: DEFAULT_AVATAR, presetId: "nusea" };
  }
  const preset = AVATAR_PRESETS.find((entry) => entry.id === raw);
  if (preset) {
    return { kind: "pixel", config: preset.config, presetId: preset.id };
  }
  try {
    const config = asConfig(JSON.parse(raw) as unknown);
    if (config) {
      return { kind: "pixel", config, presetId: matchPreset(config) };
    }
  } catch {
    // Fall through to the default avatar.
  }
  return { kind: "pixel", config: DEFAULT_AVATAR, presetId: "nusea" };
}

export function serializeAvatar(config: AvatarConfig): string {
  return JSON.stringify(config);
}
