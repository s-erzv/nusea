import { z } from "zod";
import {
  ALL_STATUSES,
  ASSET_KINDS,
  GRANT_CLUSTERS,
  GRANT_STAGES,
  IDEA_SCORE_KEYS,
  IDEA_STATUSES,
  INDEX_LEVELS,
  ITEM_TYPES,
  PRIORITIES,
  VERIFICATION_STATUSES,
  VISIBILITIES,
  VENUE_KINDS,
} from "./constants";

const idSchema = z
  .string()
  .min(1, "ID wajib diisi")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "ID hanya huruf kecil, angka, dan tanda hubung");

const timestampSchema = z.string().datetime({ offset: true });

const dateOrEmptySchema = z.string().refine(
  (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Gunakan format YYYY-MM-DD atau kosongkan",
);

const urlOrEmptySchema = z.string().refine((value) => {
  if (value === "") return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "URL harus diawali http:// atau https://");

const baseRecordShape = {
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  visibility: z.enum(VISIBILITIES),
};

export const profileSchema = z.object({
  ...baseRecordShape,
  id: z.literal("profile"),
  name: z.string().min(1, "Nama wajib diisi"),
  handle: z.string().min(1, "Handle wajib diisi"),
  campus: z.string(),
  studyProgram: z.string(),
  tagline: z.string(),
  bio: z.string(),
  avatar: z.string(),
  email: z.string().refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Email tidak valid",
  ),
  location: z.string(),
  socials: z.object({
    scholar: urlOrEmptySchema,
    orcid: urlOrEmptySchema,
    github: urlOrEmptySchema,
  }),
});

export const venueSchema = z.object({
  ...baseRecordShape,
  name: z.string().min(1, "Nama venue wajib diisi"),
  kind: z.enum(VENUE_KINDS),
  indexLevel: z.enum(INDEX_LEVELS),
  url: urlOrEmptySchema,
  typicalReviewWeeks: z.number().int().min(0).max(520),
  notes: z.string(),
});

export const itemSchema = z.object({
  ...baseRecordShape,
  title: z.string().min(1, "Judul wajib diisi"),
  type: z.enum(ITEM_TYPES),
  status: z.enum(ALL_STATUSES),
  stageNote: z.string(),
  abstract: z.string(),
  keywords: z.array(z.string()),
  authors: z.array(z.string()),
  advisors: z.array(z.string()),
  venueId: z.string(),
  submittedAt: dateOrEmptySchema,
  decisionAt: dateOrEmptySchema,
  publishedAt: dateOrEmptySchema,
  doi: z.string(),
  publicUrl: urlOrEmptySchema,
  priority: z.enum(PRIORITIES),
  progressPct: z.number().int().min(0).max(100),
  pinned: z.boolean(),
  submitChecklist: z.object({
    plagiarismChecked: z.boolean(),
    finalFileReady: z.boolean(),
  }),
});

export const assetSchema = z.object({
  ...baseRecordShape,
  kind: z.enum(ASSET_KINDS),
  label: z.string().min(1, "Label aset wajib diisi"),
  url: urlOrEmptySchema,
  localPath: z.string(),
  itemIds: z.array(z.string()),
  tags: z.array(z.string()),
  isPrimary: z.boolean(),
  note: z.string(),
});

export const sourceSchema = z.object({
  ...baseRecordShape,
  visibility: z.literal("private"),
  itemId: z.string().min(1, "Riset wajib dipilih"),
  citationText: z.string().min(1, "Teks sitasi wajib diisi"),
  urlOrDoi: z.string(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  verifiedAt: dateOrEmptySchema,
  howVerified: z.string(),
  fileOnHand: z.boolean(),
  notes: z.string(),
});

export const grantSchema = z.object({
  ...baseRecordShape,
  itemId: z.string(),
  scheme: z.string().min(1, "Skema hibah wajib diisi"),
  cluster: z.enum(GRANT_CLUSTERS),
  maxFundingIdr: z.number().int().min(0),
  piName: z.string(),
  team: z.array(z.string()),
  proposalDeadline: dateOrEmptySchema,
  selectionStage: z.enum(GRANT_STAGES),
  requiredOutputs: z.array(z.string()),
  outputDeadline: dateOrEmptySchema,
  editionNote: z.string(),
});

export const ideaSchema = z.object({
  ...baseRecordShape,
  title: z.string().min(1, "Judul ide wajib diisi"),
  problem: z.string(),
  whyOnChain: z.string(),
  cluster: z.enum(GRANT_CLUSTERS),
  scores: z.object(
    Object.fromEntries(
      IDEA_SCORE_KEYS.map((key) => [key, z.number().min(0).max(10)]),
    ) as Record<(typeof IDEA_SCORE_KEYS)[number], z.ZodNumber>,
  ),
  status: z.enum(IDEA_STATUSES),
});

export const taskSchema = z.object({
  ...baseRecordShape,
  visibility: z.literal("private"),
  title: z.string().min(1, "Judul tugas wajib diisi"),
  dueAt: dateOrEmptySchema,
  done: z.boolean(),
  itemId: z.string(),
  priority: z.enum(PRIORITIES),
  notes: z.string(),
});

export const historySchema = z.object({
  ...baseRecordShape,
  visibility: z.literal("private"),
  itemId: z.string().min(1),
  fromStatus: z.union([z.enum(ALL_STATUSES), z.literal("")]),
  toStatus: z.enum(ALL_STATUSES),
  changedAt: timestampSchema,
  note: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type ResearchItem = z.infer<typeof itemSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type SourceLog = z.infer<typeof sourceSchema>;
export type Grant = z.infer<typeof grantSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export type Task = z.infer<typeof taskSchema>;
export type HistoryEntry = z.infer<typeof historySchema>;

export const recordSchemas = {
  items: itemSchema,
  assets: assetSchema,
  venues: venueSchema,
  sources: sourceSchema,
  grants: grantSchema,
  ideas: ideaSchema,
  tasks: taskSchema,
  history: historySchema,
} as const;

export type EntityName = keyof typeof recordSchemas;

export const fileSchemas = {
  profile: profileSchema,
  items: z.array(itemSchema),
  assets: z.array(assetSchema),
  venues: z.array(venueSchema),
  sources: z.array(sourceSchema),
  grants: z.array(grantSchema),
  ideas: z.array(ideaSchema),
  tasks: z.array(taskSchema),
  history: z.array(historySchema),
} as const;

export type EntityFile = keyof typeof fileSchemas;
