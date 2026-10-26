import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLeaks } from "../scripts/check-leak";

const dirs: string[] = [];

async function tempDist(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nuza-dist-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("check:leak", () => {
  it("menemukan ID privat, URL privat, dan nama field privat", async () => {
    const dist = await tempDist();
    await writeFile(
      path.join(dist, "app.js"),
      'const a="id-rahasia-123";const b="https://drive.google.com/private-x";const notes="x";',
      "utf8",
    );

    const findings = await findLeaks(dist, {
      items: [
        {
          id: "id-rahasia-123",
          visibility: "private",
          url: "https://drive.google.com/private-x",
        },
      ],
    });

    expect(findings.join("\n")).toContain('ID privat "id-rahasia-123"');
    expect(findings.join("\n")).toContain("URL privat");
    expect(findings.join("\n")).toContain('field/kata privat "notes"');
  });

  it("lolos bila dist bersih", async () => {
    const dist = await tempDist();
    await writeFile(path.join(dist, "app.js"), 'console.log("halo")', "utf8");
    await expect(
      findLeaks(dist, {
        items: [{ id: "id-rahasia-123", visibility: "private" }],
      }),
    ).resolves.toEqual([]);
  });

  it("CLI exit 1 saat dist disuntik data privat", async () => {
    const privateItems = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "private", "items.json"), "utf8"),
    ) as Array<{ id: string; visibility: string }>;
    const privateId = privateItems.find((item) => item.visibility === "private")?.id;
    expect(privateId).toBeTruthy();

    const dist = await tempDist();
    await writeFile(
      path.join(dist, "injected.js"),
      `export const bocor = ${JSON.stringify(privateId)};`,
      "utf8",
    );

    const result = spawnSync(
      "pnpm",
      ["exec", "tsx", "scripts/check-leak.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, NUZA_DIST: dist },
        encoding: "utf8",
        timeout: 30_000,
      },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("CHECK LEAK GAGAL");
  });
});
