import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function normalizeRemoteAddress(address?: string | null): string {
  if (!address) return "";
  return address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address;
}

export function isLoopbackAddress(address?: string | null): boolean {
  const normalized = normalizeRemoteAddress(address);
  return normalized === "127.0.0.1" || normalized === "::1";
}

export function safeTokenEquals(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function authorizeRequest(
  remoteAddress: string | null | undefined,
  providedToken: string | undefined,
  expectedToken: string,
): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (!isLoopbackAddress(remoteAddress)) {
    return {
      ok: false,
      status: 403,
      error: "Back office is only available on 127.0.0.1.",
    };
  }
  if (!providedToken || !safeTokenEquals(providedToken, expectedToken)) {
    return {
      ok: false,
      status: 401,
      error: "Invalid admin session token. Copy the token from the terminal.",
    };
  }
  return { ok: true };
}

export function accessGuard(token: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = authorizeRequest(
      req.socket.remoteAddress,
      req.get("x-nusea-token"),
      token,
    );
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    next();
  };
}
