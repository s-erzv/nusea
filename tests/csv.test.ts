import { describe, expect, it } from "vitest";
import {
  csvToRecords,
  parseBoolean,
  parseList,
  parseNumber,
  serializeCsv,
} from "../admin/lib/csv";

describe("CSV admin", () => {
  it("menulis dan membaca kembali nilai dengan koma, kutip, dan baris baru", () => {
    const text = serializeCsv(
      ["id", "title", "tags"],
      [{ id: "satu", title: 'Judul, "kutip"\nbaris dua', tags: ["a", "b"] }],
    );
    const records = csvToRecords(text);
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe('Judul, "kutip"\nbaris dua');
    expect(parseList(records[0].tags)).toEqual(["a", "b"]);
  });

  it("mengubah boolean, angka, dan daftar dengan aman", () => {
    expect(parseBoolean("ya")).toBe(true);
    expect(parseBoolean("false")).toBe(false);
    expect(parseNumber("12")).toBe(12);
    expect(parseNumber("bukan angka", 3)).toBe(3);
    expect(parseList(" satu | dua || ")).toEqual(["satu", "dua"]);
  });
});
