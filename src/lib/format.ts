import { statusProgress } from "../../shared/status";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function formatDate(value: string): string {
  if (!value) return "Belum diisi";
  const parsed = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatDateShort(value: string): string {
  if (!value) return "—";
  const parsed = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export { statusProgress };

export function excerpt(value: string, length = 190): string {
  if (!value) return "Abstrak belum diisi.";
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function doiUrl(doi: string): string {
  if (!doi) return "";
  if (/^https?:\/\//i.test(doi)) return doi;
  return `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`;
}
