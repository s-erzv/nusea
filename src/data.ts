import profileRaw from "../data/public/profile.json";
import itemsRaw from "../data/public/items.json";
import assetsRaw from "../data/public/assets.json";
import venuesRaw from "../data/public/venues.json";
import {
  publicAssetSchema,
  publicDataProfileSchema,
  publicItemSchema,
  publicVenueSchema,
} from "../shared/public-schemas";

export const profile = publicDataProfileSchema.parse(profileRaw);
export const items = itemsRaw.map((item) => publicItemSchema.parse(item));
export const assets = assetsRaw.map((asset) => publicAssetSchema.parse(asset));
export const venues = venuesRaw.map((venue) => publicVenueSchema.parse(venue));

export const venueById = new Map(venues.map((venue) => [venue.id, venue]));

export const publishedItems = items.filter(
  (item) => item.status === "published",
);

export const publicTags = [...new Set(assets.flatMap((asset) => asset.tags))].sort(
  (a, b) => a.localeCompare(b, "id"),
);
