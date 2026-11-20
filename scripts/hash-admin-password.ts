import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../admin/server/auth";

async function main() {
  const fromArg = process.argv[2];
  const password =
    fromArg ?? (await prompt("Admin password: "));
  if (!password || password.length < 12) {
    throw new Error("Use a password with at least 12 characters.");
  }
  const hash = hashPassword(password);
  console.log("");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
  console.log("");
  console.log("Store both values as environment variables on the admin host.");
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
