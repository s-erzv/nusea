// Build-time public data: read only the allowlisted VIEWS through nusea_web.
// No owner credentials, no data/private, no committed JSON.
import path from "node:path";
import { Pool } from "pg";
import {
  publicAssetSchema,
  publicDataProfileSchema,
  publicGrantSchema,
  publicIdeaSchema,
  publicItemSchema,
  publicVenueSchema,
} from "../shared/public-schemas";
import { atomicWriteJson } from "./lib/io";

const url = process.env.NUSEA_WEB_DATABASE_URL?.trim();
if (!url) throw new Error("NUSEA_WEB_DATABASE_URL is required (role nusea_web, views only)");

const pool = new Pool({ connectionString: url, max: 2, application_name: "nusea-publish" });
const publicDir = path.join(process.cwd(), "data", "public");

type Row = Record<string, any>;

const item = (r: Row) =>
  publicItemSchema.parse({
    id: r.id,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    title: r.title ?? "",
    type: r.type ?? "",
    status: r.status ?? "",
    abstract: r.abstract ?? "",
    keywords: r.keywords ?? [],
    authors: r.authors ?? [],
    venueId: r.venue_id ?? "",
    submittedAt: r.submitted_at ?? "",
    decisionAt: r.decision_at ?? "",
    publishedAt: r.published_at ?? "",
    doi: r.doi ?? "",
    publicUrl: r.public_url ?? "",
    pinned: r.pinned ?? false,
  });

const venue = (r: Row) =>
  publicVenueSchema.parse({
    id: r.id,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    name: r.name ?? "",
    kind: r.kind ?? "",
    indexLevel: r.index_level ?? "",
    url: r.url ?? "",
    typicalReviewWeeks: Number(r.typical_review_weeks ?? 0),
  });

const asset = (r: Row) =>
  publicAssetSchema.parse({
    id: r.id,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    kind: r.kind ?? "",
    label: r.label ?? "",
    url: r.url ?? "",
    researchIds: r.research_ids ?? [],
    tags: r.tags ?? [],
    isPrimary: r.is_primary ?? false,
  });

const grant = (r: Row) =>
  publicGrantSchema.parse({
    id: r.id,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    scheme: r.scheme ?? "",
    cluster: r.cluster ?? "",
    proposalDeadline: r.proposal_deadline ?? "",
    selectionStage: r.selection_stage ?? "",
    requiredOutputs: r.required_outputs ?? [],
    outputDeadline: r.output_deadline ?? "",
  });

const idea = (r: Row) =>
  publicIdeaSchema.parse({
    id: r.id,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    title: r.title ?? "",
    problem: r.problem ?? "",
    whyOnChain: r.why_on_chain ?? "",
    cluster: r.cluster ?? "",
    scores: r.scores ?? {},
    status: r.status ?? "",
  });

const profile = (r: Row) =>
  publicDataProfileSchema.parse(
    r?.id
      ? {
          id: r.id,
          createdAt: r.created_at ?? "",
          updatedAt: r.updated_at ?? "",
          name: r.name ?? "",
          handle: r.handle ?? "",
          campus: r.campus ?? "",
          studyProgram: r.study_program ?? "",
          tagline: r.tagline ?? "",
          bio: r.bio ?? "",
          avatar: r.avatar ?? "",
          socials: r.socials ?? {},
        }
      : null,
  );

async function rows(view: string): Promise<Row[]> {
  const r = await pool.query(`select * from nusea.${view}`);
  return r.rows as Row[];
}

async function main() {
  try {
    const [items, venues, assets, grants, ideas, profileRows] = await Promise.all([
      rows("public_research"),
      rows("public_venues"),
      rows("public_assets"),
      rows("public_grants"),
      rows("public_ideas"),
      rows("public_scholar_profile"),
    ]);
    const bundle = {
      items: items.map(item),
      venues: venues.map(venue),
      assets: assets.map(asset),
      grants: grants.map(grant),
      ideas: ideas.map(idea),
      profile: profile(profileRows[0] ?? {}),
    };
    await Promise.all([
      atomicWriteJson(path.join(publicDir, "items.json"), bundle.items),
      atomicWriteJson(path.join(publicDir, "venues.json"), bundle.venues),
      atomicWriteJson(path.join(publicDir, "assets.json"), bundle.assets),
      atomicWriteJson(path.join(publicDir, "grants.json"), bundle.grants),
      atomicWriteJson(path.join(publicDir, "ideas.json"), bundle.ideas),
      atomicWriteJson(path.join(publicDir, "profile.json"), bundle.profile),
    ]);
    console.log(
      `Public data: ${bundle.items.length} research, ${bundle.assets.length} assets, ${bundle.venues.length} venues, ${bundle.grants.length} grants, ${bundle.ideas.length} ideas.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to fetch public data:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
