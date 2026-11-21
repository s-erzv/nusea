import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import express, { type NextFunction, type Request, type Response } from "express";
import { ALL_STATUSES, type ResearchStatus } from "../../shared/constants";
import { itemRecordSchema } from "../../shared/schemas";
import { accessGuard, isLoopbackAddress } from "./guard";
import { createStore } from "./create-store";
import { ConflictError, formatZodError, isEntityFile } from "./data-store";
import {
  LoginLimiter,
  clearSessionCookie,
  loginHandler,
  readSession,
  sessionGuard,
  type AuthConfig,
} from "./auth";
import {
  commitGithub,
  previewGithub,
  triggerNetlifyHook,
} from "./publish-github";

const execFileAsync = promisify(execFile);

export type AdminMode = "local" | "online";
export type AdminUi = "static" | "none";

export interface AppOptions {
  root: string;
  mode: AdminMode;
  ui: AdminUi;
  token?: string;
  passwordHash?: string;
  sessionSecret?: string;
}

export interface AdminApp {
  app: express.Express;
  close: () => Promise<void>;
}

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
      cwd: process.cwd(),
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

export async function createAdminApp(options: AppOptions): Promise<AdminApp> {
  const { root, mode, ui } = options;
  const store = createStore(root);
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const app = express();

  let authConfig: AuthConfig | null = null;
  if (mode === "online") {
    if (!options.passwordHash || !options.sessionSecret) {
      throw new Error(
        "ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET are required in online mode.",
      );
    }
    authConfig = {
      passwordHash: options.passwordHash,
      sessionSecret: options.sessionSecret,
      secureCookie: process.env.ADMIN_COOKIE_SECURE !== "0",
    };
  }
  const limiter = new LoginLimiter();

  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

  app.use((req, res, next) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
    if (mode === "online") {
      res.setHeader(
        "content-security-policy",
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'",
      );
      if (req.secure || process.env.ADMIN_FORCE_HSTS === "1") {
        res.setHeader(
          "strict-transport-security",
          "max-age=31536000; includeSubDomains",
        );
      }
    }
    next();
  });

  if (mode === "local") {
    app.use((req, res, next) => {
      if (!isLoopbackAddress(req.socket.remoteAddress)) {
        res
          .status(403)
          .json({ error: "Back office is only available on 127.0.0.1." });
        return;
      }
      next();
    });
  }

  app.use(express.json({ limit: "4mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, root, mode });
  });

  if (mode === "online" && authConfig) {
    const config = authConfig;
    app.get("/api/auth/session", (req, res) => {
      const session = readSession(config.sessionSecret, req.headers.cookie);
      res.setHeader("cache-control", "no-store");
      res.json({
        authenticated: Boolean(session),
        csrfToken: session?.csrf ?? null,
      });
    });

    app.post("/api/auth/login", loginHandler(config, limiter));

    app.post("/api/auth/logout", (_req, res) => {
      const secure = config.secureCookie;
      res.setHeader("set-cookie", clearSessionCookie(secure));
      res.json({ ok: true });
    });

    app.use("/api", sessionGuard(config));
    app.use("/api", (_req, res, next) => {
      res.setHeader("cache-control", "no-store");
      next();
    });
  } else {
    app.get("/api/auth/session", (_req, res) => {
      res.json({ online: false, authenticated: true, csrfToken: null });
    });
    app.use("/api", accessGuard(options.token ?? ""));
  }

  app.get(
    "/api/bootstrap",
    asyncRoute(async (_req, res) => {
      const [data, updatedAt] = await Promise.all([
        store.readAll(),
        store.versions(),
      ]);
      res.json({ data, updatedAt, serverTime: new Date().toISOString() });
    }),
  );

  app.get(
    "/api/backups",
    asyncRoute(async (_req, res) => {
      res.json({ backups: await store.listBackups() });
    }),
  );

  app.get(
    "/api/backups/:name",
    asyncRoute(async (req, res) => {
      try {
        const content = await store.readBackup(req.params.name);
        res.type("application/json").send(content);
      } catch (error) {
        const invalid =
          error instanceof Error && error.message === "Invalid backup name.";
        res
          .status(invalid ? 400 : 404)
          .json({ error: invalid ? error.message : "Backup not found." });
      }
    }),
  );

  app.get(
    "/api/export",
    asyncRoute(async (_req, res) => {
      const data = await store.readAll();
      res
        .type("application/json")
        .setHeader(
          "content-disposition",
          `attachment; filename="nusea-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        )
        .send(`${JSON.stringify(data, null, 2)}\n`);
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
      const body = req.body as
        | { value?: unknown; expected_updated_at?: unknown }
        | undefined;
      const value = body?.value;
      if (value === undefined) {
        res.status(400).json({ error: "Body must contain { value }." });
        return;
      }
      const expected =
        typeof body?.expected_updated_at === "string"
          ? body.expected_updated_at
          : undefined;
      try {
        if (entity === "items") {
          const done = await store.writeItemsWithHistory(
            itemRecordSchema.array().parse(value),
            expected,
          );
          res.json({
            ok: true,
            value: done.value,
            backupPath: done.backupPath,
            historyEntries: done.entries.length,
            savedAt: new Date().toISOString(),
          });
          return;
        }
        const result = await store.write(entity, value, expected);
        res.json({
          ok: true,
          value: result.value,
          backupPath: result.backupPath,
          savedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof ConflictError) {
          res.status(409).json({ error: error.message, code: "conflict" });
          return;
        }
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
      const { status, note, expected_updated_at } = (req.body ?? {}) as {
        status?: string;
        note?: string;
        expected_updated_at?: string;
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
          typeof expected_updated_at === "string"
            ? expected_updated_at
            : undefined,
        );
        res.json({ ok: true, ...result });
      } catch (error) {
        if (error instanceof ConflictError) {
          res.status(409).json({ error: error.message, code: "conflict" });
          return;
        }
        res.status(400).json({
          error:
            error instanceof Error ? error.message : "Could not move status.",
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
          message: response.ok
            ? "Link responded."
            : "Link did not respond properly.",
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
      if (mode === "online") {
        const result = await previewGithub(await store.readAll());
        res.status(result.ok ? 200 : 422).json(result);
        return;
      }
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
      const safeMessage =
        typeof message === "string" && message.trim()
          ? message.trim().slice(0, 160)
          : `data: publish ${new Date().toISOString().slice(0, 10)}`;
      if (mode === "online") {
        const result = await commitGithub(await store.readAll(), safeMessage);
        res.status(result.ok ? 200 : 502).json(result);
        return;
      }
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
      if (mode === "online") {
        const result = await triggerNetlifyHook();
        res.status(result.ok ? 200 : 502).json(result);
        return;
      }
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
      console.error(
        "[admin]",
        error instanceof Error ? error.stack ?? error.message : String(error),
      );
      res.status(500).json({ error: message });
    },
  );

  if (ui === "static") {
    const dist = path.join(root, "admin", "dist");
    app.use(
      express.static(dist, {
        index: false,
        maxAge: "1h",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("cache-control", "no-store");
          }
        },
      }),
    );
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.join(dist, "index.html"), (error) => {
        if (error) {
          res
            .status(503)
            .send("Admin build not found. Run pnpm admin:build first.");
        }
      });
    });
  }

  return {
    app,
    close: async () => {
      await store.close();
    },
  };
}
