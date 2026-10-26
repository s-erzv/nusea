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

export function hasToken(): boolean {
  return token.length > 0;
}

export function setToken(value: string): void {
  token = value.trim();
  localStorage.setItem(TOKEN_KEY, token);
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
  if (!token) throw new ApiError("Session token is missing.", 401);
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-nusea-token": token,
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
    api<{ data: AdminData; serverTime: string }>("/api/bootstrap"),

  saveEntity: <K extends EntityFile>(entity: K, value: unknown) =>
    api<{
      ok: true;
      value: unknown;
      backupPath: string | null;
      savedAt: string;
    }>(`/api/entities/${entity}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),

  transition: (id: string, status: string, note?: string) =>
    api<{ ok: true; entry: unknown }>(`/api/items/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),

  checkLink: (url: string) =>
    api<CheckLinkResult>("/api/check-link", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  backups: () => api<{ backups: BackupEntry[] }>("/api/backups"),

  backupText: async (name: string) => {
    if (!token) throw new ApiError("Session token is missing.", 401);
    const response = await fetch(`/api/backups/${encodeURIComponent(name)}`, {
      headers: { "x-nusea-token": token },
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
