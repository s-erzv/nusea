import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { ENTITY_FILES } from "../admin/server/data-store";
import { fileSchemas } from "../shared/schemas";
import { loadEnv } from "./lib/env";

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from the nuzas-office .env into nusea/.env.",
    );
  }

  const pool = new Pool({ connectionString: url, max: 2, application_name: "nusea-seed" });
  try {
    const root = process.cwd();
    const schema = await readFile(path.join(root, "db", "nusea.sql"), "utf8");
    await pool.query(schema);
    console.log("Schema ready: nusea.documents, nusea.document_backups.");

    for (const entity of ENTITY_FILES) {
      const file = path.join(root, "data", "private", `${entity}.json`);
      let raw: string;
      try {
        raw = await readFile(file, "utf8");
      } catch {
        console.log(`skip ${entity}: no data/private/${entity}.json`);
        continue;
      }
      const value = fileSchemas[entity].parse(JSON.parse(raw));
      const result = await pool.query(
        `insert into nusea.documents (entity, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (entity) do nothing`,
        [entity, JSON.stringify(value)],
      );
      console.log(
        result.rowCount === 1
          ? `seeded ${entity}`
          : `kept ${entity} (already in Neon)`,
      );
    }

    const { rows } = await pool.query<{ entity: string; count?: number }>(
      "select entity from nusea.documents order by entity",
    );
    console.log(`Neon documents: ${rows.map((row) => row.entity).join(", ")}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("db:setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
