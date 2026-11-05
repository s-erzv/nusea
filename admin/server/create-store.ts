import { loadEnv } from "../../scripts/lib/env";
import { DataStore, type EntityStore } from "./data-store";
import { NeonDataStore } from "./neon-store";

export function createStore(root = process.cwd()): EntityStore {
  loadEnv(root);
  const url = process.env.DATABASE_URL;
  if (url) return new NeonDataStore(url);
  return new DataStore(root);
}
