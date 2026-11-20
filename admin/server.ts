import { randomBytes } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";
import { createAdminApp } from "./server/app";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.ADMIN_PORT ?? "5174", 10);
const passwordHash = process.env.ADMIN_PASSWORD_HASH;
const sessionSecret = process.env.ADMIN_SESSION_SECRET;
const localMode =
  process.env.ADMIN_LOCAL === "1" ||
  (process.env.NODE_ENV !== "production" && !passwordHash);
const token = randomBytes(32).toString("hex");

const { app, close } = await createAdminApp({
  root,
  mode: localMode ? "local" : "online",
  ui: localMode ? "none" : "static",
  token,
  passwordHash,
  sessionSecret,
});

let viteClose: (() => Promise<void>) | null = null;
if (localMode) {
  const vite = await createViteServer({
    root: path.join(root, "admin"),
    configFile: false,
    publicDir: path.join(root, "admin", "public"),
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
    cacheDir: path.join(root, "node_modules", ".vite-admin"),
    resolve: { dedupe: ["react", "react-dom"] },
    server: {
      middlewareMode: true,
      hmr: false,
      fs: { allow: [root] },
    },
  });
  app.use(vite.middlewares);
  viteClose = () => vite.close();
}

const server = http.createServer(app);
server.listen(port, localMode ? "127.0.0.1" : "0.0.0.0", () => {
  console.log("");
  console.log(`  NUSEA — BACK OFFICE (${localMode ? "LOCAL" : "ONLINE"})`);
  console.log(`  URL   : http://127.0.0.1:${port}`);
  if (localMode) console.log(`  TOKEN : ${token}`);
  console.log(`  STORE : ${process.env.DATABASE_URL ? "Neon Postgres (nusea schema)" : "local JSON files"}`);
  console.log(
    localMode
      ? "  Accepts connections from 127.0.0.1 only."
      : "  Password login, secure cookie, CSRF, and rate limiting enabled.",
  );
  console.log("");
});

function shutdown() {
  server.close(() => process.exit(0));
  void close();
  if (viteClose) void viteClose();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
