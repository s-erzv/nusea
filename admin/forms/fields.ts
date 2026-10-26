import type { FieldDef } from "../components/SchemaForm";
import {
  assetKindOptions,
  grantClusterOptions,
  grantStageOptions,
  ideaScoreFields,
  ideaStatusOptions,
  indexOptions,
  priorityOptions,
  statusOptions,
  typeOptions,
  venueKindOptions,
  verificationOptions,
  visibilityOptions,
} from "../lib/helpers";
import type { AdminData } from "../lib/types";

function idField(isNew: boolean): FieldDef {
  return {
    key: "id",
    label: "ID (slug)",
    type: "text",
    readOnly: !isNew,
    help: isNew
      ? "Huruf kecil, angka, tanda hubung. Dipakai di URL publik."
      : "ID tidak bisa diubah setelah dibuat.",
  };
}

const visibilityField: FieldDef = {
  key: "visibility",
  label: "Visibilitas",
  type: "select",
  options: visibilityOptions,
  help: "Hanya item publik yang diekspor ke situs publik.",
};

function itemOptions(data: AdminData) {
  return [
    { value: "", label: "— Tidak terkait —" },
    ...data.items
      .map((item) => ({ value: item.id, label: item.title }))
      .sort((a, b) => a.label.localeCompare(b.label, "id")),
  ];
}

export function itemFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Judul", type: "text", wide: true },
    { key: "type", label: "Jenis", type: "select", options: typeOptions },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "stageNote", label: "Catatan tahap", type: "textarea", rows: 3 },
    { key: "abstract", label: "Abstrak", type: "textarea", rows: 7 },
    { key: "keywords", label: "Kata kunci (satu per baris)", type: "list" },
    { key: "authors", label: "Penulis (satu per baris)", type: "list" },
    { key: "advisors", label: "Pembimbing (satu per baris)", type: "list" },
    {
      key: "venueId",
      label: "Venue",
      type: "select",
      options: [
        { value: "", label: "— Tanpa venue —" },
        ...data.venues.map((venue) => ({ value: venue.id, label: venue.name })),
      ],
    },
    { key: "submittedAt", label: "Tanggal submit", type: "date" },
    { key: "decisionAt", label: "Tanggal keputusan", type: "date" },
    { key: "publishedAt", label: "Tanggal terbit", type: "date" },
    { key: "doi", label: "DOI", type: "text", placeholder: "10.xxxx/xxxxx" },
    { key: "publicUrl", label: "URL publik", type: "url" },
    { key: "priority", label: "Prioritas", type: "select", options: priorityOptions },
    {
      key: "progressPct",
      label: "Progres manual (%)",
      type: "number",
      min: 0,
      max: 100,
    },
    { key: "pinned", label: "Sematkan di quest board", type: "checkbox" },
    visibilityField,
    {
      key: "submitChecklist.plagiarismChecked",
      label: "Cek plagiasi selesai",
      type: "checkbox",
    },
    {
      key: "submitChecklist.finalFileReady",
      label: "File final siap",
      type: "checkbox",
    },
  ];
}

export function assetFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "label", label: "Label", type: "text", wide: true },
    { key: "kind", label: "Jenis", type: "select", options: assetKindOptions },
    { key: "url", label: "URL", type: "url" },
    {
      key: "localPath",
      label: "Path lokal privat",
      type: "text",
      help: "Contoh: assets-private/cropsage/dataset.csv. Tidak diekspor.",
    },
    { key: "tags", label: "Tag (satu per baris)", type: "list" },
    {
      key: "itemIds",
      label: "Kaitkan ke riset",
      type: "checks",
      options: itemOptions(data).slice(1),
    },
    { key: "isPrimary", label: "Aset utama", type: "checkbox" },
    { key: "note", label: "Catatan privat", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function venueFields(isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "name", label: "Nama venue", type: "text", wide: true },
    { key: "kind", label: "Jenis", type: "select", options: venueKindOptions },
    {
      key: "indexLevel",
      label: "Tingkat indeks",
      type: "select",
      options: indexOptions,
    },
    { key: "url", label: "URL", type: "url" },
    {
      key: "typicalReviewWeeks",
      label: "Estimasi review (minggu)",
      type: "number",
      min: 0,
      max: 520,
    },
    { key: "notes", label: "Catatan privat", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function sourceFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    {
      key: "itemId",
      label: "Riset",
      type: "select",
      options: itemOptions(data).slice(1),
    },
    { key: "citationText", label: "Teks sitasi", type: "textarea", rows: 4 },
    { key: "urlOrDoi", label: "URL atau DOI", type: "text", wide: true },
    {
      key: "verificationStatus",
      label: "Status verifikasi",
      type: "select",
      options: verificationOptions,
    },
    { key: "verifiedAt", label: "Tanggal verifikasi", type: "date" },
    { key: "howVerified", label: "Cara verifikasi", type: "textarea", rows: 3 },
    { key: "fileOnHand", label: "Dokumen sudah dipegang", type: "checkbox" },
    { key: "notes", label: "Catatan privat", type: "textarea", rows: 3 },
  ];
}

export function grantFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    {
      key: "itemId",
      label: "Riset induk",
      type: "select",
      options: itemOptions(data),
    },
    { key: "scheme", label: "Skema", type: "text" },
    { key: "cluster", label: "Klaster", type: "select", options: grantClusterOptions },
    {
      key: "maxFundingIdr",
      label: "Dana maksimum (Rp)",
      type: "number",
      min: 0,
      step: 1000000,
    },
    { key: "piName", label: "Nama PI", type: "text" },
    { key: "team", label: "Tim (satu per baris)", type: "list" },
    { key: "proposalDeadline", label: "Deadline proposal", type: "date" },
    {
      key: "selectionStage",
      label: "Tahap seleksi",
      type: "select",
      options: grantStageOptions,
    },
    { key: "requiredOutputs", label: "Luaran wajib (satu per baris)", type: "list" },
    { key: "outputDeadline", label: "Deadline luaran", type: "date" },
    { key: "editionNote", label: "Catatan edisi", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function ideaFields(isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Judul ide", type: "text", wide: true },
    { key: "problem", label: "Masalah", type: "textarea", rows: 3 },
    { key: "whyOnChain", label: "Mengapa on-chain", type: "textarea", rows: 3 },
    { key: "cluster", label: "Klaster", type: "select", options: grantClusterOptions },
    { key: "status", label: "Status ide", type: "select", options: ideaStatusOptions },
    ...ideaScoreFields.map<FieldDef>((score) => ({
      key: `scores.${score.key}`,
      label: `Skor ${score.label} (0-10)`,
      type: "number",
      min: 0,
      max: 10,
    })),
    visibilityField,
  ];
}

export function taskFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Judul tugas", type: "text", wide: true },
    { key: "dueAt", label: "Jatuh tempo", type: "date" },
    { key: "done", label: "Selesai", type: "checkbox" },
    {
      key: "itemId",
      label: "Riset terkait",
      type: "select",
      options: itemOptions(data),
    },
    { key: "priority", label: "Prioritas", type: "select", options: priorityOptions },
    { key: "notes", label: "Catatan privat", type: "textarea", rows: 3 },
  ];
}

export function profileFields(): FieldDef[] {
  return [
    { key: "name", label: "Nama", type: "text" },
    { key: "handle", label: "Handle", type: "text" },
    { key: "campus", label: "Kampus", type: "text", wide: true },
    { key: "studyProgram", label: "Program studi", type: "text" },
    { key: "location", label: "Lokasi", type: "text" },
    { key: "avatar", label: "Avatar", type: "text", help: "Default: nuza-pixel" },
    { key: "email", label: "Email publik", type: "text" },
    { key: "tagline", label: "Tagline", type: "text", wide: true },
    { key: "bio", label: "Bio", type: "textarea", rows: 5 },
    { key: "socials.scholar", label: "Google Scholar URL", type: "url" },
    { key: "socials.orcid", label: "ORCID URL", type: "url" },
    { key: "socials.github", label: "GitHub URL", type: "url" },
    visibilityField,
  ];
}
