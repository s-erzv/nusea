import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  atomicWriteJson,
  backupFile,
  pruneBackups,
  writeJsonWithBackup,
} from "../scripts/lib/io";

const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nuza-io-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("penulisan atomik dan backup", () => {
  it("menulis JSON dan tidak meninggalkan file temporer", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "items.json");
    await atomicWriteJson(file, [{ id: "satu" }]);

    expect(JSON.parse(await readFile(file, "utf8"))).toEqual([{ id: "satu" }]);
    const names = await readdir(dir);
    expect(names.filter((name) => name.endsWith(".tmp"))).toHaveLength(0);
    expect(names).toEqual(["items.json"]);
  });

  it("membuat backup bertimestamp berisi versi sebelum ditulis", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "items.json");
    const backupsDir = path.join(dir, ".backups");

    await atomicWriteJson(file, { versi: 1 });
    const backup = await writeJsonWithBackup(
      file,
      { versi: 2 },
      { backupsDir, keep: 20 },
    );

    expect(backup).not.toBeNull();
    expect(JSON.parse(await readFile(backup!, "utf8"))).toEqual({ versi: 1 });
    expect(JSON.parse(await readFile(file, "utf8"))).toEqual({ versi: 2 });
    expect(await readdir(backupsDir)).toHaveLength(1);
  });

  it("menyimpan hanya 20 backup terakhir", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "items.json");
    const backupsDir = path.join(dir, ".backups");
    await atomicWriteJson(file, { n: 0 });

    for (let n = 1; n <= 25; n += 1) {
      await backupFile(file, { backupsDir, keep: 20 });
      await atomicWriteJson(file, { n });
    }
    await pruneBackups(file, backupsDir, 20);

    const names = (await readdir(backupsDir)).filter((name) =>
      name.endsWith(".bak.json"),
    );
    expect(names).toHaveLength(20);
  });
});
