export const PIPELINE_STATUSES = [
  "ide",
  "riset",
  "draft",
  "review_internal",
  "submitted",
  "under_review",
  "revisi",
  "accepted",
  "published",
] as const;

export const TERMINAL_STATUSES = ["ditolak", "ditarik", "ditunda"] as const;

export const ALL_STATUSES = [...PIPELINE_STATUSES, ...TERMINAL_STATUSES] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];
export type ResearchStatus = (typeof ALL_STATUSES)[number];

export const STATUS_LABELS: Record<ResearchStatus, string> = {
  ide: "Ide",
  riset: "Riset",
  draft: "Draf",
  review_internal: "Review Internal",
  submitted: "Submitted",
  under_review: "Under Review",
  revisi: "Revisi",
  accepted: "Accepted",
  published: "Terbit",
  ditolak: "Ditolak",
  ditarik: "Ditarik",
  ditunda: "Ditunda",
};

export const STATUS_NUMBERS: Record<PipelineStatus, number> = {
  ide: 1,
  riset: 2,
  draft: 3,
  review_internal: 4,
  submitted: 5,
  under_review: 6,
  revisi: 7,
  accepted: 8,
  published: 9,
};

export const ITEM_TYPES = [
  "paper_jurnal",
  "paper_konferensi",
  "hibah",
  "prototype",
  "slides",
  "skripsi",
  "tugas_kuliah",
  "lainnya",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  paper_jurnal: "Paper Jurnal",
  paper_konferensi: "Paper Konferensi",
  hibah: "Hibah",
  prototype: "Prototipe",
  slides: "Slides",
  skripsi: "Skripsi",
  tugas_kuliah: "Tugas Kuliah",
  lainnya: "Lainnya",
};

export const ASSET_KINDS = [
  "sheets",
  "excel",
  "docs",
  "drive",
  "overleaf",
  "github",
  "figma",
  "pdf",
  "dataset",
  "slides",
  "diagram",
  "gambar",
  "lainnya",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  sheets: "Google Sheets",
  excel: "Excel",
  docs: "Docs",
  drive: "Drive",
  overleaf: "Overleaf",
  github: "GitHub",
  figma: "Figma",
  pdf: "PDF",
  dataset: "Dataset",
  slides: "Slides",
  diagram: "Diagram",
  gambar: "Gambar",
  lainnya: "Lainnya",
};

export const VENUE_KINDS = ["jurnal", "konferensi", "hibah"] as const;
export type VenueKind = (typeof VENUE_KINDS)[number];

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  jurnal: "Jurnal",
  konferensi: "Konferensi",
  hibah: "Hibah",
};

export const INDEX_LEVELS = [
  "Sinta 1",
  "Sinta 2",
  "Sinta 3",
  "Sinta 4",
  "Sinta 5",
  "Sinta 6",
  "Scopus Q1",
  "Scopus Q2",
  "Scopus Q3",
  "Scopus Q4",
  "WoS",
  "tidak_terindeks",
] as const;

export type IndexLevel = (typeof INDEX_LEVELS)[number];

export const INDEX_LEVEL_LABELS: Record<IndexLevel, string> = {
  "Sinta 1": "Sinta 1",
  "Sinta 2": "Sinta 2",
  "Sinta 3": "Sinta 3",
  "Sinta 4": "Sinta 4",
  "Sinta 5": "Sinta 5",
  "Sinta 6": "Sinta 6",
  "Scopus Q1": "Scopus Q1",
  "Scopus Q2": "Scopus Q2",
  "Scopus Q3": "Scopus Q3",
  "Scopus Q4": "Scopus Q4",
  WoS: "WoS",
  tidak_terindeks: "Tidak terindeks",
};

export const GRANT_CLUSTERS = [
  "Pembinaan",
  "Dasar Program Studi",
  "Dasar Interdisipliner",
  "Terapan KSN",
  "Terapan DUDI",
  "Terapan Global",
  "Pengembangan Pendidikan Tinggi",
  "Pengembangan Kolaborasi",
  "Pengembangan Survei KSN",
  "Kajian Aktual Strategis",
] as const;

export type GrantCluster = (typeof GRANT_CLUSTERS)[number];

export const GRANT_STAGES = [
  "persiapan",
  "diajukan",
  "ditetapkan",
  "pelaksanaan",
  "selesai",
] as const;

export type GrantStage = (typeof GRANT_STAGES)[number];

export const GRANT_STAGE_LABELS: Record<GrantStage, string> = {
  persiapan: "Persiapan",
  diajukan: "Diajukan",
  ditetapkan: "Ditetapkan",
  pelaksanaan: "Pelaksanaan",
  selesai: "Selesai",
};

export const GRANT_OUTPUT_WARNING =
  "Luaran jurnal harus terbit setelah dana diterima.";

export function isGrantOutputWarningActive(stage: GrantStage): boolean {
  return GRANT_STAGES.indexOf(stage) >= GRANT_STAGES.indexOf("ditetapkan");
}

export const VERIFICATION_STATUSES = [
  "belum",
  "terverifikasi",
  "tidak_ditemukan",
  "dibuang",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  belum: "Belum",
  terverifikasi: "Terverifikasi",
  tidak_ditemukan: "Tidak ditemukan",
  dibuang: "Dibuang",
};

export const IDEA_STATUSES = [
  "baru",
  "dievaluasi",
  "dikembangkan",
  "ditolak",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  baru: "Baru",
  dievaluasi: "Dievaluasi",
  dikembangkan: "Dikembangkan",
  ditolak: "Ditolak",
};

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

export const IDEA_SCORE_KEYS = [
  "novelty",
  "feasibility",
  "impact",
  "relevance",
] as const;

export type IdeaScoreKey = (typeof IDEA_SCORE_KEYS)[number];

export const IDEA_SCORE_LABELS: Record<IdeaScoreKey, string> = {
  novelty: "Kebaruan",
  feasibility: "Kelayakan",
  impact: "Dampak",
  relevance: "Relevansi",
};

export function ideaTotalScore(scores: Record<IdeaScoreKey, number>): number {
  return IDEA_SCORE_KEYS.reduce((total, key) => total + scores[key], 0);
}

export const VISIBILITIES = ["public", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
