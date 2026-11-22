import { describe, expect, it } from "vitest";
import {
  LoginLimiter,
  createSessionCookie,
  hashPassword,
  readSession,
  verifyPassword,
} from "../admin/server/auth";

describe("online admin auth", () => {
  it("verifies scrypt password hashes", () => {
    const hash = hashPassword("password-yang-cukup-panjang");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("password-yang-cukup-panjang", hash)).toBe(true);
    expect(verifyPassword("salah", hash)).toBe(false);
    expect(verifyPassword("password-yang-cukup-panjang", "bukan-hash")).toBe(false);
  });

  it("signs session cookies and rejects tampered ones", () => {
    const secret = "session-secret";
    const { cookie, csrfToken } = createSessionCookie(secret, true);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    const session = readSession(secret, cookie);
    expect(session?.csrf).toBe(csrfToken);
    expect(readSession("secret-lain", cookie)).toBeNull();
    const raw = cookie.split(";")[0]!;
    expect(readSession(secret, `${raw.slice(0, -1)}x`)).toBeNull();
  });

  it("limiter locks after five attempts", () => {
    const limiter = new LoginLimiter(5, 60_000, 60_000);
    for (let index = 0; index < 5; index += 1) {
      expect(limiter.check("ip").ok).toBe(true);
      limiter.fail("ip");
    }
    const locked = limiter.check("ip");
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.retryAfter).toBeGreaterThan(0);
    limiter.reset("ip");
    expect(limiter.check("ip").ok).toBe(true);
  });
});
