import { readFile } from "node:fs/promises";
import path from "node:path";
import { createStore } from "../admin/server/create-store";
import { buildTrackerPlan, parseTsv } from "./lib/tracker-import";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileArg = args.find((arg) => !arg.startsWith("--"));
const file = path.resolve(fileArg ?? "docs/tracker-sheet.tsv");

async function main() {
  const [text, store] = await Promise.all([
    readFile(file, "utf8"),
    Promise.resolve(createStore(process.cwd())),
  ]);
  try {
    const rows = parseTsv(text);
    if (rows.length === 0) throw new Error(`No tracker rows found in ${file}.`);
    const data = await store.readAll();
    const plan = buildTrackerPlan(rows, data.items, data.profile, data.venues);

    console.log(`Tracker rows: ${rows.length}`);
    console.log(`Creates: ${plan.entries.filter((e) => e.action === "create").length}`);
    console.log(`Updates: ${plan.entries.filter((e) => e.action === "update").length}`);
    console.log(`Unchanged: ${plan.entries.filter((e) => e.action === "unchanged").length}`);
    console.log(`Untouched existing items: ${plan.untouched.length}`);
    console.log("");

    for (const entry of plan.entries) {
      console.log(`${entry.sheetId} ${entry.action.toUpperCase()} ${entry.itemId}`);
      for (const change of entry.changes) {
        console.log(`  ${change.field}: ${JSON.stringify(change.from)} -> ${JSON.stringify(change.to)}`);
      }
    }

    if (plan.untouched.length > 0) {
      console.log("");
      console.log("Untouched:");
      for (const item of plan.untouched) console.log(`  ${item.id} — ${item.title}`);
    }

    if (!apply) {
      console.log("");
      console.log("Dry run only. Re-run with --apply to write (a backup is created first).");
      return;
    }

    if (plan.entries.every((entry) => entry.action === "unchanged")) {
      console.log("");
      console.log("Nothing to write.");
      return;
    }

    const versions = await store.versions();
    const result = await store.writeItemsWithHistory(plan.next, versions.items);
    console.log("");
    console.log(`Applied. History entries: ${result.entries.length}`);
    console.log(`Backup: ${result.backupPath ?? "(none)"}`);
  } finally {
    await store.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
