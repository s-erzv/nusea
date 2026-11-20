import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findLeaks } from "../../scripts/check-leak";
import {
  buildPublicData,
  type PrivateSnapshot,
} from "../../shared/public-data";

const PUBLIC_FILES = [
  "profile.json",
  "items.json",
  "assets.json",
  "venues.json",
  "grants.json",
  "ideas.json",
] as const;

export interface GithubConfig {
  repo: string;
  token: string;
  branch: string;
  hook: string;
}

export interface PublicFileChange {
  path: string;
  status: "added" | "modified" | "unchanged";
  sha?: string;
}

export interface GithubPreview {
  ok: boolean;
  stage: string;
  output: string;
  diff: string;
  status: string;
  stat: string;
  files: PublicFileChange[];
  error?: string;
}

export interface GithubCommitResult {
  ok: boolean;
  output: string;
  message?: string;
  error?: string;
}

export function githubConfig(): GithubConfig | null {
  const repo = process.env.GITHUB_REPO?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!repo || !token) return null;
  return {
    repo,
    token,
    branch: process.env.GITHUB_BRANCH?.trim() || "main",
    hook: process.env.NETLIFY_BUILD_HOOK?.trim() || "",
  };
}

export function buildPublicFiles(
  snapshot: PrivateSnapshot,
): Record<(typeof PUBLIC_FILES)[number], string> {
  const bundle = buildPublicData(snapshot);
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  return {
    "profile.json": json(bundle.profile),
    "items.json": json(bundle.items),
    "assets.json": json(bundle.assets),
    "venues.json": json(bundle.venues),
    "grants.json": json(bundle.grants),
    "ideas.json": json(bundle.ideas),
  };
}

async function assertNoLeaks(
  files: Record<string, string>,
  snapshot: PrivateSnapshot,
): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nusea-publish-"));
  try {
    await Promise.all(
      Object.entries(files).map(([name, content]) =>
        writeFile(path.join(dir, name), content, "utf8"),
      ),
    );
    const findings = await findLeaks(dir, snapshot);
    if (findings.length > 0) {
      throw new Error(`Leak check failed: ${findings.slice(0, 5).join("; ")}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function githubRequest(
  config: GithubConfig,
  endpoint: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

async function remoteFile(
  config: GithubConfig,
  file: string,
): Promise<{ content: string; sha: string } | null> {
  const response = await githubRequest(
    config,
    `/repos/${config.repo}/contents/data/public/${file}?ref=${encodeURIComponent(config.branch)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `GitHub read failed for ${file}: ${response.status} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { content?: string; sha?: string };
  if (!body.content || !body.sha) return null;
  return {
    content: Buffer.from(body.content.replaceAll("\n", ""), "base64").toString(
      "utf8",
    ),
    sha: body.sha,
  };
}

export async function previewGithub(
  snapshot: PrivateSnapshot,
): Promise<GithubPreview> {
  const config = githubConfig();
  if (!config) {
    return {
      ok: false,
      stage: "config",
      output: "",
      diff: "",
      status: "",
      stat: "",
      files: [],
      error: "Set GITHUB_REPO and GITHUB_TOKEN to publish from this host.",
    };
  }
  try {
    const files = buildPublicFiles(snapshot);
    await assertNoLeaks(files, snapshot);
    const changes: PublicFileChange[] = [];
    for (const file of PUBLIC_FILES) {
      const remote = await remoteFile(config, file);
      if (!remote) {
        changes.push({ path: file, status: "added" });
      } else if (remote.content !== files[file]) {
        changes.push({ path: file, status: "modified", sha: remote.sha });
      } else {
        changes.push({ path: file, status: "unchanged", sha: remote.sha });
      }
    }
    const changed = changes.filter((entry) => entry.status !== "unchanged");
    return {
      ok: true,
      stage: "github",
      output: changed.length
        ? changed
            .map((entry) => `${entry.status === "added" ? "A" : "M"} data/public/${entry.path}`)
            .join("\n")
        : "Public data is already up to date.",
      diff: changed.map((entry) => `~ data/public/${entry.path}`).join("\n"),
      status: changed.map((entry) => ` ${entry.status[0]!.toUpperCase()} data/public/${entry.path}`).join("\n"),
      stat: `${changed.length} file(s) changed on ${config.repo}@${config.branch}`,
      files: changes,
    };
  } catch (error) {
    return {
      ok: false,
      stage: "preview",
      output: "",
      diff: "",
      status: "",
      stat: "",
      files: [],
      error: error instanceof Error ? error.message : "Preview failed.",
    };
  }
}

export async function commitGithub(
  snapshot: PrivateSnapshot,
  message: string,
): Promise<GithubCommitResult> {
  const config = githubConfig();
  if (!config) {
    return {
      ok: false,
      output: "",
      error: "Set GITHUB_REPO and GITHUB_TOKEN to publish from this host.",
    };
  }
  try {
    const files = buildPublicFiles(snapshot);
    await assertNoLeaks(files, snapshot);
    const lines: string[] = [];
    const safeMessage = message.trim().slice(0, 160) || `data: publish ${new Date().toISOString().slice(0, 10)}`;
    for (const file of PUBLIC_FILES) {
      const remote = await remoteFile(config, file);
      if (remote?.content === files[file]) continue;
      const body: Record<string, unknown> = {
        message: safeMessage,
        content: Buffer.from(files[file]).toString("base64"),
        branch: config.branch,
      };
      if (remote?.sha) body.sha = remote.sha;
      const response = await githubRequest(
        config,
        `/repos/${config.repo}/contents/data/public/${file}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
      if (!response.ok) {
        throw new Error(
          `GitHub commit failed for ${file}: ${response.status} ${await response.text()}`,
        );
      }
      lines.push(`committed data/public/${file}`);
    }
    return {
      ok: true,
      output: lines.length ? lines.join("\n") : "Nothing to commit.",
      message: safeMessage,
    };
  } catch (error) {
    return {
      ok: false,
      output: "",
      error: error instanceof Error ? error.message : "Commit failed.",
    };
  }
}

export async function triggerNetlifyHook(): Promise<GithubCommitResult> {
  const hook = process.env.NETLIFY_BUILD_HOOK?.trim();
  if (!hook) {
    return {
      ok: false,
      output: "",
      error: "Set NETLIFY_BUILD_HOOK to trigger a deploy from this host.",
    };
  }
  try {
    const response = await fetch(hook, { method: "POST" });
    return {
      ok: response.ok,
      output: `Netlify build hook responded ${response.status}.`,
      error: response.ok ? undefined : "Netlify hook rejected the request.",
    };
  } catch (error) {
    return {
      ok: false,
      output: "",
      error: error instanceof Error ? error.message : "Hook failed.",
    };
  }
}
