import serverless from "serverless-http";
import { createAdminApp } from "../../admin/server/app";

process.env.NUSEA_APP_NAME = process.env.NUSEA_APP_NAME ?? "nusea-admin-netlify";

let handlerPromise: Promise<ReturnType<typeof serverless>> | null = null;

function getHandler() {
  handlerPromise ??= createAdminApp({
    root: process.cwd(),
    mode: "online",
    ui: "none",
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    sessionSecret: process.env.ADMIN_SESSION_SECRET,
  }).then(({ app }) => serverless(app));
  return handlerPromise;
}

function normalizePath(path: string): string {
  const stripped = path.replace(/^\/.netlify\/functions\/admin/, "");
  if (stripped.startsWith("/api")) return stripped || "/api";
  return `/api${stripped}`;
}

type AdminHandlerArgs = Parameters<Awaited<ReturnType<typeof getHandler>>>;

export async function handler(...[event, context]: AdminHandlerArgs) {
  const fn = await getHandler();
  const target = event as { path?: string };
  target.path = normalizePath(target.path ?? "/api");
  return fn(event, context);
}
