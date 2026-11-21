import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function publicDataApi(): Plugin {
  return {
    name: "nusea-public-data-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      const url = env.NUSEA_WEB_DATABASE_URL?.trim();
      let poolPromise: Promise<import("pg").Pool> | null = null;

      function getPool() {
        if (!url) {
          throw new Error(
            "NUSEA_WEB_DATABASE_URL is required for live public data.",
          );
        }
        poolPromise ??= import("pg").then(
          ({ Pool }) =>
            new Pool({
              connectionString: url,
              max: 2,
              application_name: "nusea-public-dev",
            }),
        );
        return poolPromise;
      }

      server.middlewares.use("/api/public-data", (request, response) => {
        if (request.method !== "GET") {
          response.statusCode = 405;
          response.end("Method not allowed.");
          return;
        }
        void (async () => {
          try {
            const pool = await getPool();
            const { readPublicBundle } = await import("./shared/public-views");
            const bundle = await readPublicBundle(pool);
            response.setHeader("content-type", "application/json");
            response.setHeader("cache-control", "no-store");
            response.end(JSON.stringify(bundle));
          } catch (error) {
            response.statusCode = 500;
            response.setHeader("content-type", "application/json");
            response.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Public data unavailable.",
              }),
            );
          }
        })();
      });

      server.httpServer?.once("close", () => {
        void poolPromise?.then((pool) => pool.end());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), publicDataApi()],
  build: {
    sourcemap: false,
    target: "es2022",
  },
});
