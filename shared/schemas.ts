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
  .min(1, "ID is required")
  .regex(/^[a-z0-9][a-z0-9-]*$/, "ID must use lowercase letters, numbers, and hyphens");

const timestampSchema = z.string().datetime({ offset: true });

const dateOrEmptySchema = z.string().refine(
  (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
  "Use YYYY-MM-DD format or leave it empty",
);

const urlOrEmptySchema = z.string().refine((value) => {
  if (value === "") return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "URL must start with http:// or https://");

const baseRecordShape = {
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  visibility: z.enum(VISIBILITIES),
};

export const profileSchema = z.object({
  ...baseRecordShape,
  id: z.literal("profile"),
  name: z.string().min(1, "Name is required"),
  handle: z.string().min(1, "Handle is required"),
  campus: z.string(),
  studyProgram: z.string(),
  tagline: z.string(),
  bio: z.string(),
  avatar: z.string(),
  email: z.string().refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Invalid email",
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
  name: z.string().min(1, "Venue name is required"),
  kind: z.enum(VENUE_KINDS),
  indexLevel: z.enum(INDEX_LEVELS),
  url: urlOrEmptySchema,
  typicalReviewWeeks: z.number().int().min(0).max(520),
  notes: z.string(),
});

export const itemSchema = z.object({
  ...baseRecordShape,
  title: z.string().min(1, "Title is required"),
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
  label: z.string().min(1, "Asset label is required"),
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
  itemId: z.string().min(1, "Research item is required"),
  citationText: z.string().min(1, "Citation text is required"),
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
  scheme: z.string().min(1, "Grant scheme is required"),
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
  title: z.string().min(1, "Idea title is required"),
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
  title: z.string().min(1, "Task title is required"),
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
