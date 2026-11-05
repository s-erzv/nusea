import { existsSync } from "node:fs";
import path from "node:path";

let loaded = false;

export function loadEnv(root = process.cwd()): void {
  if (loaded || process.env.DATABASE_URL) return;
  loaded = true;
  for (const name of [".env.local", ".env"]) {
    const file = path.join(root, name);
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      return;
    }
  }
}
