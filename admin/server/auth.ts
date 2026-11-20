import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const SESSION_COOKIE = "nusea_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface SessionPayload {
  exp: number;
  csrf: string;
}

export class LoginLimiter {
  private readonly attempts = new Map<
    string,
    { count: number; firstAt: number; lockedUntil: number }
  >();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60_000, lockMs = 15 * 60_000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.lockMs = lockMs;
  }

  check(key: string): { ok: true } | { ok: false; retryAfter: number } {
    const entry = this.attempts.get(key);
    if (!entry) return { ok: true };
    const now = Date.now();
    if (entry.lockedUntil > now) {
      return { ok: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    if (now - entry.firstAt > this.windowMs) {
      this.attempts.delete(key);
    }
    return { ok: true };
  }

  fail(key: string): void {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || now - entry.firstAt > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
      return;
    }
    entry.count += 1;
    if (entry.count >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockMs;
    }
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionCookie(
  secret: string,
  secure: boolean,
): { cookie: string; csrfToken: string } {
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_TTL_MS,
    csrf: randomBytes(18).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const value = `${encoded}.${sign(encoded, secret)}`;
  const cookie = serializeCookie(value, {
    httpOnly: true,
    secure,
    sameSite: "Strict",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return { cookie, csrfToken: payload.csrf };
}

export function clearSessionCookie(secure: boolean): string {
  return serializeCookie("", {
    httpOnly: true,
    secure,
    sameSite: "Strict",
    maxAge: 0,
  });
}

export function readSession(
  secret: string,
  cookieHeader: string | undefined,
): SessionPayload | null {
  const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now() || !payload.csrf) return null;
    return payload;
  } catch {
    return null;
  }
}

function serializeCookie(
  value: string,
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict";
    maxAge: number;
  },
): string {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${options.maxAge}`,
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const index = part.indexOf("=");
      if (index === -1) return [];
      return [[part.slice(0, index).trim(), part.slice(index + 1).trim()]];
    }),
  );
}

export interface AuthConfig {
  passwordHash: string;
  sessionSecret: string;
  secureCookie: boolean;
}

export function sessionGuard(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = readSession(config.sessionSecret, req.headers.cookie);
    if (!session) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (unsafe && req.get("x-csrf-token") !== session.csrf) {
      res.status(403).json({ error: "Invalid CSRF token." });
      return;
    }
    res.locals.csrfToken = session.csrf;
    next();
  };
}

export function loginHandler(config: AuthConfig, limiter: LoginLimiter) {
  return (req: Request, res: Response): void => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const gate = limiter.check(key);
    if (!gate.ok) {
      res
        .status(429)
        .set("Retry-After", String(gate.retryAfter))
        .json({ error: `Too many attempts. Try again in ${gate.retryAfter}s.` });
      return;
    }
    const { password } = (req.body ?? {}) as { password?: string };
    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ error: "Password is required." });
      return;
    }
    if (!verifyPassword(password, config.passwordHash)) {
      limiter.fail(key);
      res.status(401).json({ error: "Wrong password." });
      return;
    }
    limiter.reset(key);
    const { cookie, csrfToken } = createSessionCookie(
      config.sessionSecret,
      config.secureCookie,
    );
    res.setHeader("set-cookie", cookie);
    res.json({ ok: true, csrfToken });
  };
}
