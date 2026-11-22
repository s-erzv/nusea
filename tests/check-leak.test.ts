import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLeaks } from "../scripts/check-leak";

const dirs: string[] = [];

async function tempDist(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nusea-dist-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("check:leak", () => {
  it("finds private IDs, private URLs and private field names", async () => {
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

    expect(findings.join("\n")).toContain('private ID "id-rahasia-123"');
    expect(findings.join("\n")).toContain("private URL");
    expect(findings.join("\n")).toContain('private field/word "notes"');
  });

  it("finds internal item fields (advisors, progressPct)", async () => {
    const dist = await tempDist();
    await writeFile(path.join(dist, "app.js"), 'const x={advisors:[],progressPct:10};', "utf8");
    const findings = await findLeaks(dist, { items: [] });
    for (const field of ["advisors", "progressPct"]) {
      expect(findings.join("\n")).toContain(`private field/word "${field}"`);
    }
  });

  it("passes when dist is clean", async () => {
    const dist = await tempDist();
    await writeFile(path.join(dist, "app.js"), 'console.log("halo")', "utf8");
    await expect(
      findLeaks(dist, {
        items: [{ id: "id-rahasia-123", visibility: "private" }],
      }),
    ).resolves.toEqual([]);
  });

  it("CLI exits 1 when private data is injected into dist", async () => {
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
        env: { ...process.env, NUSEA_DIST: dist },
        encoding: "utf8",
        timeout: 30_000,
      },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("CHECK LEAK FAILED");
  }, 30_000);
});
