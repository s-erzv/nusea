import { describe, expect, it } from "vitest";
import {
  authorizeRequest,
  isLoopbackAddress,
  normalizeRemoteAddress,
} from "../admin/server/guard";

const token = "token-sesi-rahasia";

describe("admin server guard", () => {
  it("recognises loopback addresses only", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("192.168.1.8")).toBe(false);
    expect(isLoopbackAddress("10.0.0.2")).toBe(false);
    expect(isLoopbackAddress("203.0.113.9")).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
    expect(normalizeRemoteAddress("::ffff:192.168.1.8")).toBe("192.168.1.8");
  });

  it("rejects non-localhost requests with 403", () => {
    expect(authorizeRequest("192.168.1.8", token, token)).toEqual({
      ok: false,
      status: 403,
      error: expect.stringContaining("127.0.0.1"),
    });
    expect(authorizeRequest("203.0.113.9", token, token).ok).toBe(false);
  });

  it("rejects wrong or empty tokens with 401", () => {
    expect(authorizeRequest("127.0.0.1", "salah", token)).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(authorizeRequest("127.0.0.1", undefined, token)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("accepts localhost with the correct token", () => {
    expect(authorizeRequest("::1", token, token)).toEqual({ ok: true });
  });
});
