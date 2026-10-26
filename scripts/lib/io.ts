import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  open,
  readdir,
  rename,
  rm,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

export async function atomicWriteJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const handle = await open(tempPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export interface BackupOptions {
  backupsDir: string;
  keep?: number;
}

export async function backupFile(
  filePath: string,
  options: BackupOptions,
): Promise<string | null> {
  try {
    await stat(filePath);
  } catch {
    return null;
  }

  await mkdir(options.backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    options.backupsDir,
    `${path.basename(filePath)}.${stamp}.${randomUUID().slice(0, 8)}.bak.json`,
  );
  await copyFile(filePath, backupPath);
  await pruneBackups(filePath, options.backupsDir, options.keep ?? 20);
  return backupPath;
}

export async function pruneBackups(
  filePath: string,
  backupsDir: string,
  keep: number,
): Promise<void> {
  const prefix = `${path.basename(filePath)}.`;
  let names: string[];
  try {
    names = await readdir(backupsDir);
  } catch {
    return;
  }
  const matching = names
    .filter((name) => name.startsWith(prefix) && name.endsWith(".bak.json"))
    .sort()
    .reverse();
  await Promise.all(
    matching.slice(keep).map((name) => unlink(path.join(backupsDir, name))),
  );
}

export async function writeJsonWithBackup(
  filePath: string,
  value: unknown,
  options: BackupOptions,
): Promise<string | null> {
  const backupPath = await backupFile(filePath, options);
  await atomicWriteJson(filePath, value);
  return backupPath;
}
