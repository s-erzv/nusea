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
  PUBLIC_ITEM_FIELDS,
  VENUE_KINDS,
} from "./constants";
import type {
  Asset,
  Grant,
  Idea,
  Profile,
  ResearchItem,
  Venue,
} from "./schemas";

const publicBaseShape = {
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const publicProfileSchema = z.object({
  ...publicBaseShape,
  name: z.string(),
  handle: z.string(),
  campus: z.string(),
  studyProgram: z.string(),
  tagline: z.string(),
  bio: z.string(),
  avatar: z.string(),
  socials: z.object({
    scholar: z.string(),
    orcid: z.string(),
    github: z.string(),
  }),
});

export const publicItemSchema = z.object({
  ...publicBaseShape,
  title: z.string(),
  type: z.enum(ITEM_TYPES),
  status: z.enum(ALL_STATUSES),
  abstract: z.string(),
  keywords: z.array(z.string()),
  authors: z.array(z.string()),
  detail: z.string(),
  venueId: z.string(),
  submittedAt: z.string(),
  decisionAt: z.string(),
  publishedAt: z.string(),
  doi: z.string(),
  publicUrl: z.string(),
  pinned: z.boolean(),
  progress: z.number().int().min(0).max(100).nullable(),
  publicFields: z.array(z.enum(PUBLIC_ITEM_FIELDS)),
});

export const publicAssetSchema = z.object({
  ...publicBaseShape,
  kind: z.enum(ASSET_KINDS),
  label: z.string(),
  url: z.string(),
  researchIds: z.array(z.string()),
  tags: z.array(z.string()),
  isPrimary: z.boolean(),
});

export const publicVenueSchema = z.object({
  ...publicBaseShape,
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  indexLevel: z.enum(INDEX_LEVELS),
  url: z.string(),
  typicalReviewWeeks: z.number(),
});

export const publicGrantSchema = z.object({
  ...publicBaseShape,
  scheme: z.string(),
  cluster: z.enum(GRANT_CLUSTERS),
  proposalDeadline: z.string(),
  selectionStage: z.enum(GRANT_STAGES),
  requiredOutputs: z.array(z.string()),
  outputDeadline: z.string(),
});

export const publicIdeaSchema = z.object({
  ...publicBaseShape,
  title: z.string(),
  problem: z.string(),
  whyOnChain: z.string(),
  cluster: z.enum(GRANT_CLUSTERS),
  scores: z.object(
    Object.fromEntries(
      IDEA_SCORE_KEYS.map((key) => [key, z.number()]),
    ) as Record<(typeof IDEA_SCORE_KEYS)[number], z.ZodNumber>,
  ),
  status: z.enum(IDEA_STATUSES),
});

export const publicDataProfileSchema = z.union([publicProfileSchema, z.null()]);

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicItem = z.infer<typeof publicItemSchema>;
export type PublicAsset = z.infer<typeof publicAssetSchema>;
export type PublicVenue = z.infer<typeof publicVenueSchema>;
export type PublicGrant = z.infer<typeof publicGrantSchema>;
export type PublicIdea = z.infer<typeof publicIdeaSchema>;

export function hasPublicField(
  item: PublicItem,
  field: (typeof PUBLIC_ITEM_FIELDS)[number],
): boolean {
  return item.publicFields.includes(field);
}

export function toPublicProfile(profile: Profile): PublicProfile | null {
  if (profile.visibility !== "public") return null;
  return publicProfileSchema.parse({
    id: profile.id,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    name: profile.name,
    handle: profile.handle,
    campus: profile.campus,
    studyProgram: profile.studyProgram,
    tagline: profile.tagline,
    bio: profile.bio,
    avatar: profile.avatar,
    socials: profile.socials,
  });
}

export function toPublicItem(item: ResearchItem): PublicItem {
  const has = (field: (typeof PUBLIC_ITEM_FIELDS)[number]) =>
    item.publicFields.includes(field);
  return publicItemSchema.parse({
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    title: item.title,
    type: item.type,
    status: item.status,
    abstract: has("abstract") ? item.abstract : "",
    keywords: has("keywords") ? item.keywords : [],
    authors: has("authors") ? item.authors : [],
    detail: has("detail") ? item.detail : "",
    venueId: has("venue") ? item.venueId : "",
    submittedAt: has("dates") ? item.submittedAt : "",
    decisionAt: has("dates") ? item.decisionAt : "",
    publishedAt: has("dates") ? item.publishedAt : "",
    doi: has("links") ? item.doi : "",
    publicUrl: has("links") ? item.publicUrl : "",
    pinned: item.pinned,
    progress: has("progress") ? item.progressPct : null,
    publicFields: item.publicFields,
  });
}

export function toPublicAsset(
  asset: Asset,
  publicItemIds: ReadonlySet<string>,
): PublicAsset {
  return publicAssetSchema.parse({
    id: asset.id,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    kind: asset.kind,
    label: asset.label,
    url: asset.url,
    researchIds: asset.itemIds.filter((id) => publicItemIds.has(id)),
    tags: asset.tags,
    isPrimary: asset.isPrimary,
  });
}

export function toPublicVenue(venue: Venue): PublicVenue {
  return publicVenueSchema.parse({
    id: venue.id,
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt,
    name: venue.name,
    kind: venue.kind,
    indexLevel: venue.indexLevel,
    url: venue.url,
    typicalReviewWeeks: venue.typicalReviewWeeks,
  });
}

export function toPublicGrant(grant: Grant): PublicGrant {
  return publicGrantSchema.parse({
    id: grant.id,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
    scheme: grant.scheme,
    cluster: grant.cluster,
    proposalDeadline: grant.proposalDeadline,
    selectionStage: grant.selectionStage,
    requiredOutputs: grant.requiredOutputs,
    outputDeadline: grant.outputDeadline,
  });
}

export function toPublicIdea(idea: Idea): PublicIdea {
  return publicIdeaSchema.parse({
    id: idea.id,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    title: idea.title,
    problem: idea.problem,
    whyOnChain: idea.whyOnChain,
    cluster: idea.cluster,
    scores: idea.scores,
    status: idea.status,
  });
}
