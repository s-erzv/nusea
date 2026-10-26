import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import {
  ALL_STATUSES,
  type ResearchStatus,
} from "../../shared/constants";
import {
  fileSchemas,
  historySchema,
  type EntityFile,
  type HistoryEntry,
  type ResearchItem,
} from "../../shared/schemas";
import { statusProgress } from "../../shared/status";
import { writeJsonWithBackup } from "../../scripts/lib/io";

export const ENTITY_FILES = [
  "profile",
  "items",
  "assets",
  "venues",
  "sources",
  "grants",
  "ideas",
  "tasks",
  "history",
] as const;

export type DataFiles = {
  profile: z.infer<(typeof fileSchemas)["profile"]>;
  items: z.infer<(typeof fileSchemas)["items"]>;
  assets: z.infer<(typeof fileSchemas)["assets"]>;
  venues: z.infer<(typeof fileSchemas)["venues"]>;
  sources: z.infer<(typeof fileSchemas)["sources"]>;
  grants: z.infer<(typeof fileSchemas)["grants"]>;
  ideas: z.infer<(typeof fileSchemas)["ideas"]>;
  tasks: z.infer<(typeof fileSchemas)["tasks"]>;
  history: z.infer<(typeof fileSchemas)["history"]>;
};

export function isEntityFile(value: string): value is EntityFile {
  return (ENTITY_FILES as readonly string[]).includes(value);
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const at = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${at}${issue.message}`;
    })
    .join("; ");
}

export class DataStore {
  readonly root: string;
  readonly privateDir: string;
  readonly backupsDir: string;
  readonly keepBackups: number;

  constructor(root = process.cwd(), keepBackups = 20) {
    this.root = root;
    this.privateDir = path.join(root, "data", "private");
    this.backupsDir = path.join(root, "data", ".backups");
    this.keepBackups = keepBackups;
  }

  filePath(entity: EntityFile): string {
    return path.join(this.privateDir, `${entity}.json`);
  }

  async read<K extends EntityFile>(entity: K): Promise<DataFiles[K]> {
    const raw = await readFile(this.filePath(entity), "utf8");
    return fileSchemas[entity].parse(JSON.parse(raw)) as DataFiles[K];
  }

  async readAll(): Promise<DataFiles> {
    const entries = await Promise.all(
      ENTITY_FILES.map(async (entity) => [entity, await this.read(entity)] as const),
    );
    return Object.fromEntries(entries) as DataFiles;
  }

  async write<K extends EntityFile>(
    entity: K,
    value: unknown,
  ): Promise<{ backupPath: string | null; value: DataFiles[K] }> {
    const parsed = fileSchemas[entity].parse(value) as DataFiles[K];
    const backupPath = await writeJsonWithBackup(this.filePath(entity), parsed, {
      backupsDir: this.backupsDir,
      keep: this.keepBackups,
    });
    return { backupPath, value: parsed };
  }

  async writeItemsWithHistory(nextItems: ResearchItem[]): Promise<{
    backupPath: string | null;
    value: ResearchItem[];
    entries: HistoryEntry[];
  }> {
    const previous = await this.read("items");
    const previousById = new Map(previous.map((item) => [item.id, item]));
    const history = await this.read("history");
    const now = new Date().toISOString();
    const entries = nextItems.flatMap((item) => {
      const before = previousById.get(item.id);
      if (!before || before.status === item.status) return [];
      return [
        historySchema.parse({
          id: `history-${Date.now()}-${randomUUID().slice(0, 8)}`,
          createdAt: now,
          updatedAt: now,
          visibility: "private",
          itemId: item.id,
          fromStatus: before.status,
          toStatus: item.status,
          changedAt: now,
          note: "Status diubah dari form admin.",
        }),
      ];
    });

    const write = await this.write("items", nextItems);
    if (entries.length > 0) {
      await this.write("history", [...history, ...entries]);
    }
    return { backupPath: write.backupPath, value: write.value, entries };
  }

  async transitionItemStatus(
    itemId: string,
    toStatus: ResearchStatus,
    note = "Dipindahkan dari kanban.",
  ): Promise<{ item: ResearchItem; entry: HistoryEntry }> {
    if (!(ALL_STATUSES as readonly string[]).includes(toStatus)) {
      throw new Error(`Status tidak dikenal: ${toStatus}`);
    }

    const items = await this.read("items");
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) throw new Error(`Riset tidak ditemukan: ${itemId}`);

    const current = items[index];
    const now = new Date().toISOString();
    const item: ResearchItem = {
      ...current,
      status: toStatus,
      updatedAt: now,
      progressPct: statusProgress(toStatus, current.progressPct),
    };

    const history = await this.read("history");
    const entry = historySchema.parse({
      id: `history-${Date.now()}-${randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      itemId,
      fromStatus: current.status,
      toStatus,
      changedAt: now,
      note,
    });

    const nextItems = items.map((value, position) =>
      position === index ? item : value,
    );

    await this.write("items", nextItems);
    await this.write("history", [...history, entry]);

    return { item, entry };
  }
}
