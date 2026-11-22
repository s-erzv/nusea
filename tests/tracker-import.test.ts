import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAuthors,
  buildTrackerPlan,
  normalizeTrackerDate,
  parseCoAuthors,
  parseTsv,
} from "../scripts/lib/tracker-import";
import { makeItem, makeProfile } from "./fixtures";

const tsv = await readFile(path.join(process.cwd(), "docs/tracker-sheet.tsv"), "utf8");

describe("tracker import", () => {
  it("reads 17 rows with 12 columns", () => {
    const rows = parseTsv(tsv);
    expect(rows).toHaveLength(17);
    expect(rows[0]).toMatchObject({
      sheetId: "T01",
      statusRaw: "Terbit",
      roleRaw: "Penulis 1",
      kindRaw: "Analisis",
      dataSourceRaw: "Terverifikasi (publik)",
    });
    expect(rows.at(-1)?.sheetId).toBe("T17");
  });

  it("maps status, verification and dates", () => {
    expect(normalizeTrackerDate("Sekitar 16 Nov 2026 (rencana submit)")).toBe("2026-11-16");
    expect(normalizeTrackerDate("2026-05-01")).toBe("2026-05-01");
    expect(normalizeTrackerDate("")).toBe("");
  });

  it("orders co-authors and own role correctly", () => {
    expect(parseCoAuthors("Bu Fitroh (2, menjawab 'Boleh'); Abisena Rais (3, rencana)")).toEqual([
      "Bu Fitroh",
      "Abisena Rais",
    ]);
    expect(parseCoAuthors("Penulis 1 belum dicatat")).toEqual([]);
    expect(buildAuthors("penulis_1", ["Evy Nurmiati"], "Sarah")).toEqual([
      "Sarah",
      "Evy Nurmiati",
    ]);
    expect(buildAuthors("penulis_2", ["Annazma"], "Sarah")).toEqual([
      "Annazma",
      "Sarah",
    ]);
  });

  it("plans 10 new items and 7 updates", () => {
    const rows = parseTsv(tsv);
    const existing = [
      makeItem({ id: "platform-governance-sertifikasi", visibility: "public" }),
      makeItem({ id: "slr-identitas-nomor-telepon" }),
      makeItem({ id: "slr-llm-game-argumentation" }),
      makeItem({ id: "wallet-noncustodial-togaf" }),
      makeItem({ id: "saku-v1" }),
      makeItem({ id: "cropsage-random-forest-shap" }),
      makeItem({ id: "hibah-kepatuhan-syariah" }),
      makeItem({ id: "saku-v2" }),
    ];
    const plan = buildTrackerPlan(rows, existing, makeProfile(), []);
    expect(plan.entries.filter((entry) => entry.action === "create")).toHaveLength(10);
    expect(plan.entries.filter((entry) => entry.action === "update")).toHaveLength(7);
    expect(plan.untouched.map((item) => item.id)).toEqual(["saku-v2"]);
    expect(plan.next).toHaveLength(18);
    const t02 = plan.next.find((item) => item.id === "slr-identitas-nomor-telepon");
    expect(t02).toMatchObject({
      trackerId: "T02",
      status: "published",
      role: "penulis_1",
      researchKind: "slr",
      researchCategory: "penelitian_pribadi",
      dataSource: "terverifikasi_publik",
    });
    const t03 = plan.next.find((item) => item.id === "t03-cobit-2019-audit-prioritas");
    expect(t03).toMatchObject({
      status: "ide",
      researchCategory: "penelitian_pribadi",
      dataSource: "perlu_dicek",
      visibility: "private",
    });
  });
});
