import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";
import { ALL_STATUSES, type ResearchStatus } from "../shared/constants";
import { itemSchema } from "../shared/schemas";
import { accessGuard, isLoopbackAddress } from "./server/guard";
import {
  DataStore,
  formatZodError,
  isEntityFile,
} from "./server/data-store";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.ADMIN_PORT ?? "5174", 10);
const token = randomBytes(32).toString("hex");
const store = new DataStore(root);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

async function run(command: string, args: string[], timeout = 180_000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: root,
      timeout,
      maxBuffer: 12 * 1024 * 1024,
      env: { ...process.env, CI: "1", NODE_ENV: "production" },
    });
    return { ok: true as const, stdout, stderr, code: 0 };
  } catch (error) {
    const failed = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
      killed?: boolean;
    };
    return {
      ok: false as const,
      stdout: failed.stdout ?? "",
      stderr: failed.stderr ?? failed.message ?? "Command failed.",
      code: failed.code ?? 1,
      killed: failed.killed ?? false,
    };
  }
}

const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
  if (!isLoopbackAddress(req.socket.remoteAddress)) {
    res.status(403).json({ error: "Back office is only available on 127.0.0.1." });
    return;
  }
  next();
});
app.use(express.json({ limit: "4mb" }));
app.use("/api", accessGuard(token));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, root });
});

app.get(
  "/api/bootstrap",
  asyncRoute(async (_req, res) => {
    const data = await store.readAll();
    res.json({ data, serverTime: new Date().toISOString() });
  }),
);

app.get(
  "/api/backups",
  asyncRoute(async (_req, res) => {
    let names: string[] = [];
    try {
      names = await readdir(store.backupsDir);
    } catch {
      names = [];
    }
    const backups = await Promise.all(
      names
        .filter((name) => name.endsWith(".bak.json"))
        .map(async (name) => {
          const info = await stat(path.join(store.backupsDir, name));
          return {
            name,
            size: info.size,
            modifiedAt: info.mtime.toISOString(),
          };
        }),
    );
    backups.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    res.json({ backups });
  }),
);

app.get(
  "/api/backups/:name",
  asyncRoute(async (req, res) => {
    const name = req.params.name;
    if (
      !name.endsWith(".bak.json") ||
      path.basename(name) !== name ||
      name.includes("..")
    ) {
      res.status(400).json({ error: "Invalid backup name." });
      return;
    }
    try {
      const content = await readFile(path.join(store.backupsDir, name), "utf8");
      res.type("application/json").send(content);
    } catch {
      res.status(404).json({ error: "Backup not found." });
    }
  }),
);

app.put(
  "/api/entities/:entity",
  asyncRoute(async (req, res) => {
    const { entity } = req.params;
    if (!isEntityFile(entity)) {
      res.status(404).json({ error: `Unknown entity: ${entity}` });
      return;
    }
    const value = (req.body as { value?: unknown } | undefined)?.value;
    if (value === undefined) {
      res.status(400).json({ error: "Body must contain { value }." });
      return;
    }
    try {
      if (entity === "items") {
        const done = await store.writeItemsWithHistory(
          itemSchema.array().parse(value),
        );
        res.json({
          ok: true,
          value: done.value,
          backupPath: done.backupPath
            ? path.relative(root, done.backupPath)
            : null,
          historyEntries: done.entries.length,
          savedAt: new Date().toISOString(),
        });
        return;
      }
      const result = await store.write(entity, value);
      res.json({
        ok: true,
        value: result.value,
        backupPath: result.backupPath
          ? path.relative(root, result.backupPath)
          : null,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        res.status(400).json({
          error: formatZodError(error as never),
        });
        return;
      }
      throw error;
    }
  }),
);

app.post(
  "/api/items/:id/status",
  asyncRoute(async (req, res) => {
    const { status, note } = (req.body ?? {}) as {
      status?: string;
      note?: string;
    };
    if (!status || !(ALL_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: "Invalid status." });
      return;
    }
    try {
      const result = await store.transitionItemStatus(
        req.params.id,
        status as ResearchStatus,
        typeof note === "string" && note.trim() ? note.trim() : undefined,
      );
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Could not move status.",
      });
    }
  }),
);

app.post(
  "/api/check-link",
  asyncRoute(async (req, res) => {
    const { url } = (req.body ?? {}) as { url?: string };
    if (!url) {
      res.status(400).json({ error: "URL is required." });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      res.status(400).json({ error: "Invalid URL." });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http/https URLs are supported." });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      let response = await fetch(parsed, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      });
      if (response.status === 405 || response.status === 403) {
        response = await fetch(parsed, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { Range: "bytes=0-64" },
        });
      }
      res.json({
        ok: response.ok,
        status: response.status,
        finalUrl: response.url,
        message: response.ok ? "Link responded." : "Link did not respond properly.",
      });
    } catch (error) {
      res.json({
        ok: false,
        status: 0,
        finalUrl: url,
        message:
          error instanceof Error && error.name === "AbortError"
            ? "Link check timed out after 10 seconds."
            : "Link could not be reached.",
      });
    } finally {
      clearTimeout(timer);
    }
  }),
);

app.post(
  "/api/publish/preview",
  asyncRoute(async (_req, res) => {
    const publish = await run(pnpm, ["run", "publish:data"]);
    if (!publish.ok) {
      res.status(500).json({
        ok: false,
        stage: "publish",
        output: `${publish.stdout}\n${publish.stderr}`.trim(),
        error: "publish:data failed.",
      });
      return;
    }

    const build = await run(pnpm, ["run", "build"]);
    const diff = await run("git", ["diff", "--", "data/public"]);
    const status = await run("git", ["status", "--short", "--", "data/public"]);
    const stat = await run("git", ["diff", "--stat", "--", "data/public"]);

    res.status(build.ok ? 200 : 422).json({
      ok: build.ok,
      stage: build.ok ? "done" : "build",
      output: `${publish.stdout}\n${publish.stderr}\n${build.stdout}\n${build.stderr}`.trim(),
      diff: build.ok ? diff.stdout : "",
      status: status.stdout.trim(),
      stat: stat.stdout.trim(),
      error: build.ok
        ? undefined
        : "Build/check:leak failed. Fix it before publishing.",
    });
  }),
);

app.post(
  "/api/publish/commit",
  asyncRoute(async (req, res) => {
    const { message } = (req.body ?? {}) as { message?: string };
    const dirty = await run("git", ["status", "--porcelain", "--", "data/public"]);
    if (!dirty.stdout.trim()) {
      res.status(409).json({ error: "No public data changes to commit." });
      return;
    }
    const add = await run("git", ["add", "--", "data/public"]);
    if (!add.ok) {
      res.status(500).json({ error: add.stderr || "git add failed." });
      return;
    }
    const safeMessage =
      typeof message === "string" && message.trim()
        ? message.trim().slice(0, 160)
        : `data: publish ${new Date().toISOString().slice(0, 10)}`;
    const commit = await run("git", ["commit", "-m", safeMessage]);
    res.status(commit.ok ? 200 : 500).json({
      ok: commit.ok,
      message: safeMessage,
      output: `${commit.stdout}\n${commit.stderr}`.trim(),
      error: commit.ok ? undefined : "git commit failed.",
    });
  }),
);

app.post(
  "/api/publish/push",
  asyncRoute(async (_req, res) => {
    const push = await run("git", ["push"], 180_000);
    res.status(push.ok ? 200 : 500).json({
      ok: push.ok,
      output: `${push.stdout}\n${push.stderr}`.trim(),
      error: push.ok ? undefined : "git push failed.",
    });
  }),
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Admin endpoint not found." });
});

app.use(
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    void next;
    const message = error instanceof Error ? error.message : "Server error.";
    console.error("[admin]", error);
    res.status(500).json({ error: message });
  },
);

const vite = await createViteServer({
  root: path.join(root, "admin"),
  configFile: false,
  publicDir: false,
  appType: "spa",
  plugins: [
    react(),
    {
      name: "nusea-admin-session-token",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `<script>window.__NUSEA_ADMIN_TOKEN__=${JSON.stringify(token)}</script></head>`,
        );
      },
    },
  ],
  server: {
    middlewareMode: true,
    hmr: false,
    fs: { allow: [root] },
  },
});

app.use(vite.middlewares);

const server = http.createServer(app);
server.listen(port, "127.0.0.1", () => {
  console.log("");
  console.log("  NUSEA — BACK OFFICE (LOCAL)");
  console.log(`  URL   : http://127.0.0.1:${port}`);
  console.log(`  TOKEN : ${token}`);
  console.log("  Accepts connections from 127.0.0.1 only.");
  console.log("");
});

function shutdown() {
  server.close(() => process.exit(0));
  void vite.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
