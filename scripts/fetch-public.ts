// Build-time public data: read only the allowlisted VIEWS through nusea_web.
// No owner credentials, no data/private, no committed JSON.
import path from "node:path";
import { Pool } from "pg";
import { readPublicBundle } from "../shared/public-views";
import { atomicWriteJson } from "./lib/io";

const url = process.env.NUSEA_WEB_DATABASE_URL?.trim();
if (!url) throw new Error("NUSEA_WEB_DATABASE_URL is required (role nusea_web, views only)");

const pool = new Pool({ connectionString: url, max: 2, application_name: "nusea-publish" });
const publicDir = path.join(process.cwd(), "data", "public");

async function main() {
  try {
    const bundle = await readPublicBundle(pool);
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
