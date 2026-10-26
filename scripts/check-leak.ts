import path from "node:path";
import { readdir, readFile } from "node:fs/promises";

const TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".txt",
  ".svg",
  ".map",
  ".xml",
  ".webmanifest",
]);

const FORBIDDEN_FIELD_NAMES = [
  "notes",
  "tasks",
  "sources",
  "private_",
  "stageNote",
  "localPath",
  "itemIds",
  "howVerified",
  "fileOnHand",
  "submitChecklist",
];

function collectStrings(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, into));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectStrings(entry, into));
  }
}

function collectUrls(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) || /^10\.\d{4,9}\//.test(value)) {
      into.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUrls(entry, into));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectUrls(entry, into));
  }
}

export interface PrivateSnapshot {
  items?: unknown[];
  assets?: unknown[];
  venues?: unknown[];
  grants?: unknown[];
  ideas?: unknown[];
  sources?: unknown[];
  tasks?: unknown[];
  history?: unknown[];
  profile?: unknown;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordVisibility(value: unknown): string | undefined {
  if (value && typeof value === "object" && "visibility" in value) {
    const visibility = (value as { visibility?: unknown }).visibility;
    return typeof visibility === "string" ? visibility : undefined;
  }
  return undefined;
}

function recordId(value: unknown): string | undefined {
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

const PRIVATE_ENTITIES = ["items", "assets", "venues", "grants", "ideas"] as const;
const ALWAYS_PRIVATE_ENTITIES = ["sources", "tasks", "history"] as const;

export async function findLeaks(
  distDir: string,
  privateSnapshot: PrivateSnapshot,
  publicSnapshot?: Record<string, unknown>,
): Promise<string[]> {
  const privateIds = new Set<string>();
  const privateUrls = new Set<string>();

  for (const entity of PRIVATE_ENTITIES) {
    for (const record of asArray(privateSnapshot[entity])) {
      if (recordVisibility(record) === "public") continue;
      const id = recordId(record);
      if (id) privateIds.add(id);
      collectUrls(record, privateUrls);
    }
  }
  for (const entity of ALWAYS_PRIVATE_ENTITIES) {
    for (const record of asArray(privateSnapshot[entity])) {
      const id = recordId(record);
      if (id) privateIds.add(id);
      collectUrls(record, privateUrls);
    }
  }
  if (privateSnapshot.profile && recordVisibility(privateSnapshot.profile) !== "public") {
    const id = recordId(privateSnapshot.profile);
    if (id) privateIds.add(id);
    collectUrls(privateSnapshot.profile, privateUrls);
  }

  if (publicSnapshot) {
    const publicStrings = new Set<string>();
    collectStrings(publicSnapshot, publicStrings);
    for (const value of publicStrings) {
      privateUrls.delete(value);
      if (privateIds.has(value)) privateIds.delete(value);
    }
  }

  const findings: string[] = [];
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          return;
        }
        if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return;
        files.push(full);
      }),
    );
  }

  try {
    await walk(distDir);
  } catch {
    return [`Folder build tidak ditemukan: ${distDir}`];
  }

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const relative = path.relative(distDir, file);
    for (const id of privateIds) {
      if (id.length >= 4 && content.includes(id)) {
        findings.push(`${relative}: ID privat "${id}" ditemukan`);
      }
    }
    for (const url of privateUrls) {
      if (content.includes(url)) {
        findings.push(`${relative}: URL privat "${url}" ditemukan`);
      }
    }
    for (const field of FORBIDDEN_FIELD_NAMES) {
      const pattern = new RegExp(`(^|[^A-Za-z0-9_])${field}([^A-Za-z0-9_]|$)`);
      if (pattern.test(content)) {
        findings.push(`${relative}: field/kata privat "${field}" ditemukan`);
      }
    }
    if (content.includes("data/private")) {
      findings.push(`${relative}: referensi ke data/private ditemukan`);
    }
  }

  return [...new Set(findings)];
}

async function loadJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  const root = process.cwd();
  const privateDir = path.join(root, "data", "private");
  const publicDir = path.join(root, "data", "public");
  const distDir = path.resolve(root, process.env.NUSEA_DIST ?? "dist");

  const privateSnapshot: PrivateSnapshot = {};
  for (const entity of [
    "profile",
    "items",
    "assets",
    "venues",
    "grants",
    "ideas",
    "sources",
    "tasks",
    "history",
  ] as const) {
    try {
      (privateSnapshot as Record<string, unknown>)[entity] = await loadJson(
        path.join(privateDir, `${entity}.json`),
      );
    } catch {
      throw new Error(`Missing private file: data/private/${entity}.json`);
    }
  }

  const publicSnapshot: Record<string, unknown> = {};
  for (const entity of [
    "profile",
    "items",
    "assets",
    "venues",
    "grants",
    "ideas",
  ] as const) {
    try {
      publicSnapshot[entity] = await loadJson(
        path.join(publicDir, `${entity}.json`),
      );
    } catch {
      throw new Error(`Missing public file: data/public/${entity}.json`);
    }
  }

  const findings = await findLeaks(distDir, privateSnapshot, publicSnapshot);
  if (findings.length > 0) {
    console.error("CHECK LEAK GAGAL:");
    findings.slice(0, 40).forEach((finding) => console.error(`- ${finding}`));
    if (findings.length > 40) {
      console.error(`- dan ${findings.length - 40} temuan lain`);
    }
    process.exitCode = 1;
    return;
  }
  console.log("Leak check passed: no private IDs, URLs, or fields in dist/.");
}

if (process.argv[1]?.endsWith("check-leak.ts")) {
  main().catch((error) => {
    console.error("Leak check failed:", error);
    process.exitCode = 1;
  });
}
