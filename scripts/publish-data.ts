import path from "node:path";
import { createStore } from "../admin/server/create-store";
import { buildPublicData, type PrivateSnapshot } from "../shared/public-data";
import { atomicWriteJson } from "./lib/io";

process.env.NUSEA_APP_NAME = process.env.NUSEA_APP_NAME ?? "nusea-publish";

const publicDir = path.join(process.cwd(), "data", "public");

export async function readPrivateSnapshot(): Promise<PrivateSnapshot> {
  const store = createStore(process.cwd());
  try {
    const all = await store.readAll();
    return {
      profile: all.profile,
      items: all.items,
      assets: all.assets,
      venues: all.venues,
      grants: all.grants,
      ideas: all.ideas,
    };
  } finally {
    await store.close();
  }
}

async function main() {
  const source = await readPrivateSnapshot();
  const bundle = buildPublicData(source);

  await Promise.all([
    atomicWriteJson(path.join(publicDir, "profile.json"), bundle.profile),
    atomicWriteJson(path.join(publicDir, "items.json"), bundle.items),
    atomicWriteJson(path.join(publicDir, "assets.json"), bundle.assets),
    atomicWriteJson(path.join(publicDir, "venues.json"), bundle.venues),
    atomicWriteJson(path.join(publicDir, "grants.json"), bundle.grants),
    atomicWriteJson(path.join(publicDir, "ideas.json"), bundle.ideas),
  ]);

  console.log(
    `Public data: ${bundle.items.length} research, ${bundle.assets.length} assets, ${bundle.venues.length} venues, ${bundle.grants.length} grants, ${bundle.ideas.length} ideas.`,
  );
}

if (process.argv[1]?.endsWith("publish-data.ts")) {
  main().catch((error) => {
    console.error("Failed to publish data:", error);
    process.exitCode = 1;
  });
}
