import type { Pool } from "pg";
import {
  publicAssetSchema,
  publicDataProfileSchema,
  publicGrantSchema,
  publicIdeaSchema,
  publicItemSchema,
  publicVenueSchema,
} from "./public-schemas";
import type { PublicBundle } from "./public-data";

type Row = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function item(row: Row) {
  return publicItemSchema.parse({
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    title: text(row.title),
    type: text(row.type),
    status: text(row.status),
    abstract: text(row.abstract),
    keywords: list(row.keywords),
    authors: list(row.authors),
    detail: text(row.detail),
    venueId: text(row.venue_id),
    submittedAt: text(row.submitted_at),
    decisionAt: text(row.decision_at),
    publishedAt: text(row.published_at),
    doi: text(row.doi),
    publicUrl: text(row.public_url),
    pinned: row.pinned === true,
    progress: row.progress == null ? null : Number(row.progress),
    publicFields: list(row.public_fields),
  });
}

function venue(row: Row) {
  return publicVenueSchema.parse({
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    name: text(row.name),
    kind: text(row.kind),
    indexLevel: text(row.index_level),
    url: text(row.url),
    typicalReviewWeeks: Number(row.typical_review_weeks ?? 0),
  });
}

function asset(row: Row) {
  return publicAssetSchema.parse({
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    kind: text(row.kind),
    label: text(row.label),
    url: text(row.url),
    researchIds: list(row.research_ids),
    tags: list(row.tags),
    isPrimary: row.is_primary === true,
  });
}

function grant(row: Row) {
  return publicGrantSchema.parse({
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    scheme: text(row.scheme),
    cluster: text(row.cluster),
    proposalDeadline: text(row.proposal_deadline),
    selectionStage: text(row.selection_stage),
    requiredOutputs: list(row.required_outputs),
    outputDeadline: text(row.output_deadline),
  });
}

function idea(row: Row) {
  return publicIdeaSchema.parse({
    id: text(row.id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    title: text(row.title),
    problem: text(row.problem),
    whyOnChain: text(row.why_on_chain),
    cluster: text(row.cluster),
    scores: row.scores ?? {},
    status: text(row.status),
  });
}

function profile(row: Row | undefined) {
  return publicDataProfileSchema.parse(
    row?.id
      ? {
          id: text(row.id),
          createdAt: text(row.created_at),
          updatedAt: text(row.updated_at),
          name: text(row.name),
          handle: text(row.handle),
          campus: text(row.campus),
          studyProgram: text(row.study_program),
          tagline: text(row.tagline),
          bio: text(row.bio),
          avatar: text(row.avatar),
          socials: row.socials ?? {},
        }
      : null,
  );
}

async function rows(db: Pick<Pool, "query">, view: string): Promise<Row[]> {
  const result = await db.query(`select * from nusea.${view}`);
  return result.rows as Row[];
}

export async function readPublicBundle(
  db: Pick<Pool, "query">,
): Promise<PublicBundle> {
  const [items, venues, assets, grants, ideas, profiles] = await Promise.all([
    rows(db, "public_research"),
    rows(db, "public_venues"),
    rows(db, "public_assets"),
    rows(db, "public_grants"),
    rows(db, "public_ideas"),
    rows(db, "public_scholar_profile"),
  ]);

  return {
    items: items.map(item),
    venues: venues.map(venue),
    assets: assets.map(asset),
    grants: grants.map(grant),
    ideas: ideas.map(idea),
    profile: profile(profiles[0]),
  };
}
