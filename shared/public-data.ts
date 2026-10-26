import type {
  Asset,
  Grant,
  Idea,
  Profile,
  ResearchItem,
  Venue,
} from "./schemas";
import {
  publicAssetSchema,
  publicGrantSchema,
  publicIdeaSchema,
  publicItemSchema,
  publicVenueSchema,
  toPublicAsset,
  toPublicGrant,
  toPublicIdea,
  toPublicItem,
  toPublicProfile,
  toPublicVenue,
  type PublicAsset,
  type PublicGrant,
  type PublicIdea,
  type PublicItem,
  type PublicProfile,
  type PublicVenue,
} from "./public-schemas";

export interface PrivateSnapshot {
  profile: Profile;
  items: ResearchItem[];
  assets: Asset[];
  venues: Venue[];
  grants: Grant[];
  ideas: Idea[];
}

export interface PublicBundle {
  profile: PublicProfile | null;
  items: PublicItem[];
  assets: PublicAsset[];
  venues: PublicVenue[];
  grants: PublicGrant[];
  ideas: PublicIdea[];
}

/**
 * Allowlist boundary. Only fields named in shared/public-schemas.ts can leave
 * the private store. Anything new stays private until added there.
 */
export function buildPublicData(source: PrivateSnapshot): PublicBundle {
  const bundle: PublicBundle = {
    profile: toPublicProfile(source.profile),
    items: source.items.filter((item) => item.visibility === "public").map(toPublicItem),
    assets: source.assets
      .filter((asset) => asset.visibility === "public")
      .map(toPublicAsset),
    venues: source.venues
      .filter((venue) => venue.visibility === "public")
      .map(toPublicVenue),
    grants: source.grants
      .filter((grant) => grant.visibility === "public")
      .map(toPublicGrant),
    ideas: source.ideas
      .filter((idea) => idea.visibility === "public")
      .map(toPublicIdea),
  };

  bundle.items.forEach((item) => publicItemSchema.parse(item));
  bundle.assets.forEach((asset) => publicAssetSchema.parse(asset));
  bundle.venues.forEach((venue) => publicVenueSchema.parse(venue));
  bundle.grants.forEach((grant) => publicGrantSchema.parse(grant));
  bundle.ideas.forEach((idea) => publicIdeaSchema.parse(idea));

  return bundle;
}
