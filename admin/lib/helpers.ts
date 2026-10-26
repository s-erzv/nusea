import {
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  GRANT_CLUSTERS,
  GRANT_STAGES,
  GRANT_STAGE_LABELS,
  IDEA_SCORE_KEYS,
  IDEA_SCORE_LABELS,
  IDEA_STATUSES,
  IDEA_STATUS_LABELS,
  INDEX_LEVELS,
  INDEX_LEVEL_LABELS,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  PIPELINE_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABELS,
  VENUE_KINDS,
  VENUE_KIND_LABELS,
} from "../../shared/constants";

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(value: string): string {
  if (!value) return "—";
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function daysUntil(value: string, from = new Date()): number | null {
  if (!value) return null;
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  return Math.round((date.getTime() - start.getTime()) / 86_400_000);
}

export function getByPath(record: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

export function setByPath<T>(record: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = structuredClone(record) as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (const key of keys.slice(0, -1)) {
    const next = cursor[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

export const statusOptions = [...PIPELINE_STATUSES, ...TERMINAL_STATUSES].map(
  (status) => ({ value: status, label: STATUS_LABELS[status] }),
);

export const typeOptions = ITEM_TYPES.map((type) => ({
  value: type,
  label: ITEM_TYPE_LABELS[type],
}));

export const assetKindOptions = ASSET_KINDS.map((kind) => ({
  value: kind,
  label: ASSET_KIND_LABELS[kind],
}));

export const venueKindOptions = VENUE_KINDS.map((kind) => ({
  value: kind,
  label: VENUE_KIND_LABELS[kind],
}));

export const indexOptions = INDEX_LEVELS.map((level) => ({
  value: level,
  label: INDEX_LEVEL_LABELS[level],
}));

export const grantClusterOptions = GRANT_CLUSTERS.map((cluster) => ({
  value: cluster,
  label: cluster,
}));

export const grantStageOptions = GRANT_STAGES.map((stage) => ({
  value: stage,
  label: GRANT_STAGE_LABELS[stage],
}));

export const priorityOptions = PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

export const verificationOptions = VERIFICATION_STATUSES.map((status) => ({
  value: status,
  label: VERIFICATION_STATUS_LABELS[status],
}));

export const ideaStatusOptions = IDEA_STATUSES.map((status) => ({
  value: status,
  label: IDEA_STATUS_LABELS[status],
}));

export const ideaScoreFields = IDEA_SCORE_KEYS.map((key) => ({
  key,
  label: IDEA_SCORE_LABELS[key],
}));

export const visibilityOptions = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];
