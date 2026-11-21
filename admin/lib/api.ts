import type { EntityFile } from "../../shared/schemas";
import type {
  AdminData,
  BackupEntry,
  CheckLinkResult,
  PublishActionResult,
  PublishPreview,
} from "./types";

const TOKEN_KEY = "nusea-admin-token";

let token =
  (typeof window !== "undefined" ? window.__NUSEA_ADMIN_TOKEN__ : undefined) ??
  (typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("token") ??
      localStorage.getItem(TOKEN_KEY))
    : null) ??
  "";

let onlineMode = false;
let csrfToken = "";

export function hasToken(): boolean {
  return token.length > 0;
}

export function setToken(value: string): void {
  token = value.trim();
  localStorage.setItem(TOKEN_KEY, token);
}

export function isOnlineMode(): boolean {
  return onlineMode;
}

export async function fetchSession(): Promise<{
  online: boolean;
  authenticated: boolean;
}> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
    });
    const body = (await response.json().catch(() => null)) as
      | {
          online?: boolean;
          authenticated?: boolean;
          csrfToken?: string | null;
        }
      | null;
    if (response.status === 404 || body?.online === false) {
      onlineMode = false;
      return { online: false, authenticated: hasToken() };
    }
    onlineMode = true;
    csrfToken = body?.csrfToken ?? "";
    return { online: true, authenticated: Boolean(body?.authenticated) };
  } catch {
    onlineMode = false;
    return { online: false, authenticated: hasToken() };
  }
}

export async function login(password: string): Promise<void> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: string; csrfToken?: string }
    | null;
  if (!response.ok) {
    throw new ApiError(body?.error ?? "Sign in failed.", response.status);
  }
  onlineMode = true;
  csrfToken = body?.csrfToken ?? "";
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  csrfToken = "";
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!onlineMode && !token) {
    throw new ApiError("Session token is missing.", 401);
  }
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(onlineMode
        ? { "x-csrf-token": csrfToken }
        : { "x-nusea-token": token }),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed (${response.status}).`, response.status);
  }
  return body as T;
}

export const adminApi = {
  bootstrap: () =>
    api<{ data: AdminData; updatedAt: Record<EntityFile, string>; serverTime: string }>("/api/bootstrap"),

  saveEntity: <K extends EntityFile>(entity: K, value: unknown, expectedUpdatedAt?: string) =>
    api<{
      ok: true;
      value: unknown;
      backupPath: string | null;
      savedAt: string;
    }>(`/api/entities/${entity}`, {
      method: "PUT",
      body: JSON.stringify({ value, ...(expectedUpdatedAt ? { expected_updated_at: expectedUpdatedAt } : {}) }),
    }),

  transition: (id: string, status: string, note?: string, expectedUpdatedAt?: string) =>
    api<{ ok: true; entry: unknown }>(`/api/items/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note, ...(expectedUpdatedAt ? { expected_updated_at: expectedUpdatedAt } : {}) }),
    }),

  checkLink: (url: string) =>
    api<CheckLinkResult>("/api/check-link", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  backups: () => api<{ backups: BackupEntry[] }>("/api/backups"),

  exportAll: async () => {
    if (!onlineMode && !token) throw new ApiError("Session token is missing.", 401);
    const response = await fetch("/api/export", {
      credentials: "same-origin",
      headers: onlineMode ? {} : { "x-nusea-token": token },
    });
    if (!response.ok) {
      throw new ApiError("Could not export JSON.", response.status);
    }
    return response.text();
  },

  backupText: async (name: string) => {
    if (!onlineMode && !token) throw new ApiError("Session token is missing.", 401);
    const response = await fetch(`/api/backups/${encodeURIComponent(name)}`, {
      credentials: "same-origin",
      headers: onlineMode ? {} : { "x-nusea-token": token },
    });
    if (!response.ok) {
      throw new ApiError("Could not download backup.", response.status);
    }
    return response.text();
  },

  publishPreview: () =>
    api<PublishPreview>("/api/publish/preview", { method: "POST" }),

  publishCommit: (message: string) =>
    api<PublishActionResult>("/api/publish/commit", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  publishPush: () =>
    api<PublishActionResult>("/api/publish/push", { method: "POST" }),
};
