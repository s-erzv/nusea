import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DataStore } from "../admin/server/data-store";
import { atomicWriteJson } from "../scripts/lib/io";
import { makeItem } from "./fixtures";

const dirs: string[] = [];

async function tempStore(): Promise<{ root: string; store: DataStore }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "nusea-store-"));
  dirs.push(root);
  await atomicWriteJson(path.join(root, "data", "private", "items.json"), [
    makeItem({ id: "riset-satu", status: "draft", progressPct: 10 }),
  ]);
  await atomicWriteJson(path.join(root, "data", "private", "history.json"), []);
  return { root, store: new DataStore(root) };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("status transitions", () => {
  it("writes the item and a history entry", async () => {
    const { root, store } = await tempStore();

    const result = await store.transitionItemStatus("riset-satu", "submitted", "Ready to submit");

    expect(result.item.status).toBe("submitted");
    expect(result.item.progressPct).toBeGreaterThanOrEqual(50);
    expect(result.entry.fromStatus).toBe("draft");
    expect(result.entry.toStatus).toBe("submitted");
    expect(result.entry.itemId).toBe("riset-satu");
    expect(result.entry.note).toBe("Ready to submit");
    expect(result.entry.visibility).toBe("private");

    const items = JSON.parse(
      await readFile(path.join(root, "data", "private", "items.json"), "utf8"),
    );
    const history = JSON.parse(
      await readFile(path.join(root, "data", "private", "history.json"), "utf8"),
    );
    expect(items[0].status).toBe("submitted");
    expect(history).toHaveLength(1);
    expect(history[0].id).toMatch(/^history-/);

    const backups = await readdir(path.join(root, "data", ".backups"));
    expect(backups.length).toBeGreaterThanOrEqual(2);
  });

  it("records history when status changes through a bulk save", async () => {
    const { root, store } = await tempStore();
    const current = await store.read("items");

    const changed = await store.writeItemsWithHistory([
      { ...current[0], status: "submitted", progressPct: 55 },
    ]);
    expect(changed.entries).toHaveLength(1);
    expect(changed.entries[0].fromStatus).toBe("draft");
    expect(changed.entries[0].toStatus).toBe("submitted");

    const unchanged = await store.writeItemsWithHistory(changed.value);
    expect(unchanged.entries).toHaveLength(0);

    const history = JSON.parse(
      await readFile(path.join(root, "data", "private", "history.json"), "utf8"),
    );
    expect(history).toHaveLength(1);
    expect(history[0].note).toBe("Status changed from the admin form.");
  });

  it("rejects unknown statuses and missing items without writing history", async () => {
    const { root, store } = await tempStore();

    await expect(
      store.transitionItemStatus("riset-satu", "entah" as never),
    ).rejects.toThrow(/Unknown status/);
    await expect(
      store.transitionItemStatus("tidak-ada", "draft"),
    ).rejects.toThrow(/not found/);

    const history = JSON.parse(
      await readFile(path.join(root, "data", "private", "history.json"), "utf8"),
    );
    expect(history).toHaveLength(0);
  });
});
