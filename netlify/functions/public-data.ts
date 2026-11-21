import { Pool } from "pg";
import { readPublicBundle } from "../../shared/public-views";

process.env.NUSEA_APP_NAME = process.env.NUSEA_APP_NAME ?? "nusea-public-netlify";

let pool: Pool | null = null;

function getPool(): Pool {
  const url = process.env.NUSEA_WEB_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("NUSEA_WEB_DATABASE_URL is required.");
  }
  pool ??= new Pool({
    connectionString: url,
    max: 2,
    application_name: "nusea-public-netlify",
  });
  return pool;
}

interface NetlifyEvent {
  httpMethod?: string;
}

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod && event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed." }),
    };
  }

  try {
    const bundle = await readPublicBundle(getPool());
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      body: JSON.stringify(bundle),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error:
          error instanceof Error ? error.message : "Public data unavailable.",
      }),
    };
  }
}
