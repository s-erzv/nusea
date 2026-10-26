import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileSchemas } from "../shared/schemas";
import { buildPublicData, type PrivateSnapshot } from "../shared/public-data";
import { atomicWriteJson } from "./lib/io";

const privateDir = path.join(process.cwd(), "data", "private");
const publicDir = path.join(process.cwd(), "data", "public");

async function readPrivateFile(name: keyof typeof fileSchemas): Promise<unknown> {
  const raw = await readFile(path.join(privateDir, `${name}.json`), "utf8");
  return fileSchemas[name].parse(JSON.parse(raw));
}

export async function readPrivateSnapshot(): Promise<PrivateSnapshot> {
  const [profile, items, assets, venues, grants, ideas] = await Promise.all([
    readPrivateFile("profile"),
    readPrivateFile("items"),
    readPrivateFile("assets"),
    readPrivateFile("venues"),
    readPrivateFile("grants"),
    readPrivateFile("ideas"),
  ]);
  return { profile, items, assets, venues, grants, ideas } as PrivateSnapshot;
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
