import type {
  Asset,
  Grant,
  Idea,
  Profile,
  ResearchItem,
  Venue,
} from "../shared/schemas";
import type { PrivateSnapshot } from "../shared/public-data";

const ts = "2026-10-20T08:00:00.000Z";

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    name: "Nusea",
    handle: "@nusea",
    campus: "Kampus",
    studyProgram: "Prodi",
    tagline: "Tagline",
    bio: "Bio",
    avatar: "nusea-pixel",
    email: "",
    location: "",
    socials: { scholar: "", orcid: "", github: "" },
    ...overrides,
  };
}

export function makeItem(overrides: Partial<ResearchItem> = {}): ResearchItem {
  return {
    id: "item-public",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    title: "Judul",
    type: "paper_jurnal",
    status: "draft",
    stageNote: "catatan tahap rahasia",
    abstract: "Abstrak",
    keywords: ["kunci"],
    authors: ["Nusea"],
    advisors: [],
    venueId: "",
    submittedAt: "",
    decisionAt: "",
    publishedAt: "",
    doi: "",
    publicUrl: "",
    priority: "high",
    progressPct: 40,
    pinned: false,
    submitChecklist: { plagiarismChecked: true, finalFileReady: false },
    ...overrides,
  };
}

export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-public",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    kind: "pdf",
    label: "PDF",
    url: "https://example.com/public.pdf",
    localPath: "assets-private/secret.pdf",
    itemIds: ["item-public"],
    tags: ["pdf"],
    isPrimary: true,
    note: "catatan aset rahasia",
    ...overrides,
  };
}

export function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "venue-public",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    name: "Jurnal",
    kind: "jurnal",
    indexLevel: "Sinta 2",
    url: "https://example.com/journal",
    typicalReviewWeeks: 8,
    notes: "catatan venue rahasia",
    ...overrides,
  };
}

export function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "grant-public",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    itemId: "item-public",
    scheme: "BOPTN",
    cluster: "Pembinaan",
    maxFundingIdr: 10000000,
    piName: "Nusea",
    team: ["Nusea"],
    proposalDeadline: "",
    selectionStage: "persiapan",
    requiredOutputs: ["Luaran jurnal"],
    outputDeadline: "",
    editionNote: "catatan edisi rahasia",
    ...overrides,
  };
}

export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-public",
    createdAt: ts,
    updatedAt: ts,
    visibility: "public",
    title: "Ide",
    problem: "Masalah",
    whyOnChain: "Alasan",
    cluster: "Pembinaan",
    scores: { novelty: 5, feasibility: 5, impact: 5, relevance: 5 },
    status: "baru",
    ...overrides,
  };
}

export function makePrivateSnapshot(
  overrides: Partial<PrivateSnapshot> = {},
): PrivateSnapshot {
  return {
    profile: makeProfile(),
    items: [makeItem()],
    assets: [makeAsset()],
    venues: [makeVenue()],
    grants: [makeGrant()],
    ideas: [makeIdea()],
    ...overrides,
  };
}
