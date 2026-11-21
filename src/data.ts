import {
  publicAssetSchema,
  publicDataProfileSchema,
  publicItemSchema,
  publicVenueSchema,
  type PublicAsset,
  type PublicItem,
  type PublicProfile,
  type PublicVenue,
} from "../shared/public-schemas";

export let profile: PublicProfile | null = null;
export let items: PublicItem[] = [];
export let assets: PublicAsset[] = [];
export let venues: PublicVenue[] = [];

export let venueById = new Map<string, PublicVenue>();

export let publishedItems: PublicItem[] = [];

export let publicTags: string[] = [];

function recomputeDerived(): void {
  venueById = new Map(venues.map((venue) => [venue.id, venue]));
  publishedItems = items.filter((item) => item.status === "published");
  publicTags = [...new Set(assets.flatMap((asset) => asset.tags))].sort((a, b) =>
    a.localeCompare(b, "id"),
  );
}

export function applyPublicData(bundle: {
  profile: unknown;
  items: unknown[];
  assets: unknown[];
  venues: unknown[];
}): void {
  profile = publicDataProfileSchema.parse(bundle.profile);
  items = bundle.items.map((item) => publicItemSchema.parse(item));
  assets = bundle.assets.map((asset) => publicAssetSchema.parse(asset));
  venues = bundle.venues.map((venue) => publicVenueSchema.parse(venue));
  recomputeDerived();
}

export async function loadPublicData(): Promise<void> {
  const response = await fetch("/api/public-data", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Public data request failed (${response.status}).`);
  }
  const bundle = (await response.json()) as {
    error?: string;
    profile?: unknown;
    items?: unknown[];
    assets?: unknown[];
    venues?: unknown[];
  };
  if (bundle.error) throw new Error(bundle.error);
  applyPublicData({
    profile: bundle.profile ?? null,
    items: bundle.items ?? [],
    assets: bundle.assets ?? [],
    venues: bundle.venues ?? [],
  });
}
