import { describe, expect, it } from "vitest";
import {
  authorizeRequest,
  isLoopbackAddress,
  normalizeRemoteAddress,
} from "../admin/server/guard";

const token = "token-sesi-rahasia";

describe("guard server admin", () => {
  it("mengenali alamat loopback saja", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("192.168.1.8")).toBe(false);
    expect(isLoopbackAddress("10.0.0.2")).toBe(false);
    expect(isLoopbackAddress("203.0.113.9")).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
    expect(normalizeRemoteAddress("::ffff:192.168.1.8")).toBe("192.168.1.8");
  });

  it("menolak request non-localhost dengan 403", () => {
    expect(authorizeRequest("192.168.1.8", token, token)).toEqual({
      ok: false,
      status: 403,
      error: expect.stringContaining("127.0.0.1"),
    });
    expect(authorizeRequest("203.0.113.9", token, token).ok).toBe(false);
  });

  it("menolak token salah atau kosong dengan 401", () => {
    expect(authorizeRequest("127.0.0.1", "salah", token)).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(authorizeRequest("127.0.0.1", undefined, token)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("menerima localhost dengan token benar", () => {
    expect(authorizeRequest("::1", token, token)).toEqual({ ok: true });
  });
});
