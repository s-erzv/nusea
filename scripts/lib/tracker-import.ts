import {
  type DataSource,
  type ItemRole,
  type ResearchCategory,
  type ResearchKind,
  type ResearchStatus,
} from "../../shared/constants";
import type { Profile, ResearchItem } from "../../shared/schemas";
import { statusProgress } from "../../shared/status";

export const TRACKER_COLUMNS = [
  "ID",
  "Judul (kerja atau terbit)",
  "Peran saya",
  "Status",
  "Jenis",
  "Target jurnal / venue",
  "Co-author (urutan)",
  "Terbit / tenggat",
  "Langkah berikutnya",
  "Link",
  "Sumber data",
  "Catatan",
] as const;

export interface TrackerRow {
  sheetId: string;
  title: string;
  roleRaw: string;
  statusRaw: string;
  kindRaw: string;
  targetVenue: string;
  coAuthorsRaw: string;
  dateRaw: string;
  nextStep: string;
  link: string;
  dataSourceRaw: string;
  notes: string;
}

export interface TrackerPlanEntry {
  action: "create" | "update" | "unchanged";
  sheetId: string;
  itemId: string;
  title: string;
  changes: Array<{ field: string; from: string; to: string }>;
}

export interface TrackerPlan {
  entries: TrackerPlanEntry[];
  next: ResearchItem[];
  untouched: ResearchItem[];
}

export const SHEET_ITEM_IDS: Record<string, string> = {
  T01: "platform-governance-sertifikasi",
  T02: "slr-identitas-nomor-telepon",
  T06: "slr-llm-game-argumentation",
  T07: "wallet-noncustodial-togaf",
  T08: "saku-v1",
  T09: "cropsage-random-forest-shap",
  T16: "hibah-kepatuhan-syariah",
};

const NEW_ITEM_IDS: Record<string, string> = {
  T03: "t03-cobit-2019-audit-prioritas",
  T04: "t04-slr-cobit-2019-jiteki",
  T05: "t05-slr-tata-kelola-etika-ai",
  T10: "t10-odoo-19-erp-bibu",
  T11: "t11-itil-v4-pt-bsm",
  T12: "t12-audit-cobit-2019-bibu",
  T13: "t13-tokenisasi-sukuk-manfaat",
  T14: "t14-arsitektur-pasar-kepatuhan-syariah",
  T15: "t15-platform-tokenisasi-manfaat-regulasi",
  T17: "t17-tugas-akhir-tokenisasi-wakaf",
};

const STATUS_MAP: Record<string, ResearchStatus> = {
  Ide: "ide",
  Riset: "riset",
  Menulis: "draft",
  Submit: "submitted",
  Review: "under_review",
  Revisi: "revisi",
  Terbit: "published",
  Mandek: "ditunda",
};

const ROLE_MAP: Record<string, ItemRole> = {
  "Penulis 1": "penulis_1",
  "Penulis 2": "penulis_2",
  "Penulis 3": "penulis_3",
  "Penulis tunggal": "penulis_tunggal",
};

const KIND_MAP: Record<string, ResearchKind> = {
  SLR: "slr",
  Arsitektur: "arsitektur",
  Analisis: "analisis",
  "Rancang bangun": "rancang_bangun",
  "Proposal hibah": "proposal_hibah",
  "Tugas kuliah": "tugas_kuliah",
  "Tugas akhir": "tugas_akhir",
  Lainnya: "lainnya",
};

const KIND_TO_TYPE: Record<ResearchKind, ResearchItem["type"]> = {
  slr: "paper_jurnal",
  arsitektur: "paper_jurnal",
  analisis: "paper_jurnal",
  rancang_bangun: "paper_jurnal",
  proposal_hibah: "hibah",
  tugas_kuliah: "tugas_kuliah",
  tugas_akhir: "skripsi",
  lainnya: "lainnya",
  belum_dicatat: "lainnya",
};

const SOURCE_MAP: Record<string, DataSource> = {
  "Terverifikasi (publik)": "terverifikasi_publik",
  "Catatan obrolan": "catatan_obrolan",
  "Perlu dicek": "perlu_dicek",
};

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  mei: "05",
  may: "05",
  jun: "06",
  jul: "07",
  agu: "08",
  aug: "08",
  sep: "09",
  okt: "10",
  oct: "10",
  nov: "11",
  des: "12",
  dec: "12",
};

export function parseTsv(text: string): TrackerRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const headers = lines[0].split("\t").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return {
      sheetId: record["ID"] ?? "",
      title: record["Judul (kerja atau terbit)"] ?? "",
      roleRaw: record["Peran saya"] ?? "",
      statusRaw: record["Status"] ?? "",
      kindRaw: record["Jenis"] ?? "",
      targetVenue: record["Target jurnal / venue"] ?? "",
      coAuthorsRaw: record["Co-author (urutan)"] ?? "",
      dateRaw: record["Terbit / tenggat"] ?? "",
      nextStep: record["Langkah berikutnya"] ?? "",
      link: record["Link"] ?? "",
      dataSourceRaw: record["Sumber data"] ?? "",
      notes: record["Catatan"] ?? "",
    };
  });
}

export function normalizeTrackerDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(trimmed);
  if (!match) return "";
  const month = MONTHS[match[2]!.slice(0, 3).toLowerCase()];
  if (!month) return "";
  return `${match[3]}-${month}-${match[1]!.padStart(2, "0")}`;
}

export function parseCoAuthors(value: string): string[] {
  const skip = /^(penulis\s+\d|tanpa dospem|belum ditentukan|belum ada)/i;
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry && !skip.test(entry))
    .map((entry, index) => {
      const order = /\((\d+)/.exec(entry);
      const name = entry.replace(/\s*\(.*$/, "").trim();
      return { name, order: order ? Number(order[1]) : index + 1 };
    })
    .filter((entry) => entry.name !== "")
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.name);
}

export function buildAuthors(
  role: ItemRole,
  coAuthors: string[],
  profileName: string,
): string[] {
  const self = profileName.trim();
  const co = coAuthors.filter((name) => name !== self);
  if (role === "penulis_tunggal") return self ? [self] : [];
  if (role === "penulis_2") {
    return self ? [co[0] ?? "", self, ...co.slice(1)].filter(Boolean) : co;
  }
  if (role === "penulis_3") {
    return self
      ? [co[0] ?? "", co[1] ?? "", self, ...co.slice(2)].filter(Boolean)
      : co;
  }
  return self ? [self, ...co] : co;
}

function inferCategory(kind: ResearchKind): ResearchCategory {
  if (kind === "proposal_hibah") return "hibah";
  if (kind === "tugas_kuliah") return "tugas_kuliah";
  if (kind === "tugas_akhir") return "tugas_akhir";
  if (kind === "belum_dicatat") return "belum_dicatat";
  return "penelitian_pribadi";
}

export function mapRow(row: TrackerRow, profileName: string): {
  status: ResearchStatus;
  role: ItemRole;
  researchKind: ResearchKind;
  researchCategory: ResearchCategory;
  dataSource: DataSource;
  authors: string[];
} {
  const status = STATUS_MAP[row.statusRaw] ?? "ide";
  const role = ROLE_MAP[row.roleRaw] ?? "belum_dicatat";
  const researchKind = KIND_MAP[row.kindRaw] ?? "belum_dicatat";
  const dataSource =
    row.statusRaw === "Belum dicek"
      ? "perlu_dicek"
      : SOURCE_MAP[row.dataSourceRaw] ?? "belum_dicatat";
  return {
    status,
    role,
    researchKind,
    researchCategory: inferCategory(researchKind),
    dataSource,
    authors: buildAuthors(role, parseCoAuthors(row.coAuthorsRaw), profileName),
  };
}

function matchVenue(
  targetVenue: string,
  venues: Array<{ id: string; name: string }>,
): string {
  const needle = targetVenue.toLowerCase();
  if (!needle) return "";
  return (
    venues.find((venue) => needle.includes(venue.name.toLowerCase()))?.id ?? ""
  );
}

function buildNewItem(
  row: TrackerRow,
  profile: Profile,
  venues: Array<{ id: string; name: string }>,
  now: string,
): ResearchItem {
  const mapped = mapRow(row, profile.name);
  const targetDate = normalizeTrackerDate(row.dateRaw);
  return {
    id: NEW_ITEM_IDS[row.sheetId] ?? `tracker-${row.sheetId.toLowerCase()}`,
    createdAt: now,
    updatedAt: now,
    visibility: "private",
    title: row.title,
    type: KIND_TO_TYPE[mapped.researchKind],
    status: mapped.status,
    stageNote: "",
    abstract: "",
    keywords: [],
    authors: mapped.authors,
    advisors: [],
    venueId: matchVenue(row.targetVenue, venues),
    submittedAt: "",
    decisionAt: "",
    publishedAt: mapped.status === "published" ? targetDate : "",
    doi: "",
    publicUrl: "",
    priority: "medium",
    progressPct: statusProgress(mapped.status),
    pinned: false,
    submitChecklist: { plagiarismChecked: false, finalFileReady: false },
    trackerId: row.sheetId,
    role: mapped.role,
    researchKind: mapped.researchKind,
    researchCategory: mapped.researchCategory,
    targetVenue: row.targetVenue,
    targetDate,
    nextStep: row.nextStep,
    dataSource: mapped.dataSource,
    link: row.link,
    notes: row.notes,
  };
}

export function buildTrackerPlan(
  rows: TrackerRow[],
  current: ResearchItem[],
  profile: Profile,
  venues: Array<{ id: string; name: string }>,
  now = new Date().toISOString(),
): TrackerPlan {
  const byId = new Map(current.map((item) => [item.id, item]));
  const next = [...current];
  const entries: TrackerPlanEntry[] = [];

  for (const row of rows) {
    const itemId = SHEET_ITEM_IDS[row.sheetId] ?? NEW_ITEM_IDS[row.sheetId];
    if (!itemId) throw new Error(`No item ID mapping for sheet row ${row.sheetId}.`);
    const existing = byId.get(itemId);
    if (!existing) {
      const item = buildNewItem(row, profile, venues, now);
      next.push(item);
      byId.set(item.id, item);
      entries.push({
        action: "create",
        sheetId: row.sheetId,
        itemId: item.id,
        title: item.title,
        changes: [],
      });
      continue;
    }

    const mapped = mapRow(row, profile.name);
    const updated: ResearchItem = {
      ...existing,
      status: mapped.status,
      trackerId: row.sheetId,
      role: mapped.role,
      researchKind: mapped.researchKind,
      researchCategory: mapped.researchCategory,
      targetVenue: row.targetVenue,
      targetDate: normalizeTrackerDate(row.dateRaw),
      nextStep: row.nextStep,
      dataSource: mapped.dataSource,
      link: row.link,
      notes: row.notes,
    };
    const changes = diffItem(existing, updated);
    if (changes.length === 0) {
      entries.push({
        action: "unchanged",
        sheetId: row.sheetId,
        itemId: itemId,
        title: existing.title,
        changes,
      });
      continue;
    }
    updated.updatedAt = now;
    updated.progressPct = statusProgress(
      updated.status,
      existing.progressPct,
    );
    next[next.findIndex((item) => item.id === itemId)] = updated;
    entries.push({
      action: "update",
      sheetId: row.sheetId,
      itemId,
      title: existing.title,
      changes: diffItem(existing, updated),
    });
  }

  const tracked = new Set(entries.map((entry) => entry.itemId));
  return {
    entries,
    next,
    untouched: current.filter((item) => !tracked.has(item.id)),
  };
}

const TRACKED_FIELDS: Array<keyof ResearchItem> = [
  "status",
  "trackerId",
  "role",
  "researchKind",
  "researchCategory",
  "targetVenue",
  "targetDate",
  "nextStep",
  "dataSource",
  "link",
  "notes",
];

function diffItem(
  before: ResearchItem,
  after: ResearchItem,
): Array<{ field: string; from: string; to: string }> {
  return TRACKED_FIELDS.flatMap((field) => {
    const from = String(before[field] ?? "");
    const to = String(after[field] ?? "");
    return from === to ? [] : [{ field, from, to }];
  });
}
