import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
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
import { loadEnv } from "../../scripts/lib/env";
import {
  ENTITY_FILES,
  type BackupEntry,
  type DataFiles,
  type EntityStore,
  ConflictError,
} from "./data-store";

const BACKUP_NAME = /\.(\d+)\.bak\.json$/;

function backupName(entity: string, id: string, createdAt: Date): string {
  const stamp = createdAt.toISOString().replaceAll(":", "-");
  return `${entity}.${stamp}.${id}.bak.json`;
}

export class NeonDataStore implements EntityStore {
  private readonly pool: Pool;
  private readonly keepBackups: number;

  constructor(connectionString?: string, keepBackups = 20) {
    loadEnv();
    const url = connectionString ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set.");
    }
    this.pool = new Pool({ connectionString: url, max: 4, application_name: process.env.NUSEA_APP_NAME ?? "nusea-admin" });
    this.keepBackups = keepBackups;
  }

  private async readTx<K extends EntityFile>(
    client: PoolClient,
    entity: K,
  ): Promise<DataFiles[K]> {
    const { rows } = await client.query<{ value: unknown }>(
      "select value from nusea.documents where entity = $1",
      [entity],
    );
    if (rows.length === 0) {
      throw new Error(
        `Missing nusea.documents row for "${entity}". Run pnpm db:setup.`,
      );
    }
    return fileSchemas[entity].parse(rows[0].value) as DataFiles[K];
  }

  private async writeTx<K extends EntityFile>(
    client: PoolClient,
    entity: K,
    value: unknown,
    expectedUpdatedAt?: string,
  ): Promise<{ backupPath: string | null; value: DataFiles[K] }> {
    const parsed = fileSchemas[entity].parse(value) as DataFiles[K];
    let backupPath: string | null = null;

    if (expectedUpdatedAt !== undefined) {
      const backup = await client.query<{ id: string; created_at: Date }>(
        `insert into nusea.document_backups (entity, value, created_at)
         select entity, value, now() from nusea.documents
         where entity = $1 and updated_at::text = $2
         returning id, created_at`,
        [entity, expectedUpdatedAt],
      );
      const updated = await client.query(
        `update nusea.documents
         set value = $2::jsonb, updated_at = now()
         where entity = $1 and updated_at::text = $3`,
        [entity, JSON.stringify(parsed), expectedUpdatedAt],
      );
      if (updated.rowCount !== 1) throw new ConflictError();
      if (backup.rows[0]) backupPath = backupName(entity, backup.rows[0].id, new Date(backup.rows[0].created_at));
    } else {
      const existing = await client.query<{ id: string; created_at: Date }>(
        `insert into nusea.document_backups (entity, value, created_at)
         select entity, value, now() from nusea.documents where entity = $1
         returning id, created_at`,
        [entity],
      );
      if (existing.rows[0]) backupPath = backupName(entity, existing.rows[0].id, new Date(existing.rows[0].created_at));
      await client.query(
        `insert into nusea.documents (entity, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (entity) do update
           set value = excluded.value, updated_at = now()`,
        [entity, JSON.stringify(parsed)],
      );
    }

    await client.query(
      `delete from nusea.document_backups
       where id in (
         select id from nusea.document_backups
         where entity = $1
         order by created_at desc, id desc
         offset $2
       )`,
      [entity, this.keepBackups],
    );

    return { backupPath, value: parsed };
  }

  private async readForUpdateTx<K extends EntityFile>(
    client: PoolClient,
    entity: K,
  ): Promise<{ value: DataFiles[K]; updatedAt: string }> {
    const { rows } = await client.query<{ value: unknown; updated_at: string }>(
      "select value, updated_at::text as updated_at from nusea.documents where entity = $1 for update",
      [entity],
    );
    if (rows.length === 0) {
      throw new Error(
        `Missing nusea.documents row for "${entity}". Run pnpm db:setup.`,
      );
    }
    const row = rows[0]!;
    return {
      value: fileSchemas[entity].parse(row.value) as DataFiles[K],
      updatedAt: row.updated_at,
    };
  }

  async read<K extends EntityFile>(entity: K): Promise<DataFiles[K]> {
    const client = await this.pool.connect();
    try {
      return await this.readTx(client, entity);
    } finally {
      client.release();
    }
  }

  async readAll(): Promise<DataFiles> {
    const { rows } = await this.pool.query<{ entity: EntityFile; value: unknown }>(
      "select entity, value from nusea.documents",
    );
    const found = new Map(rows.map((row) => [row.entity, row.value]));
    const entries = ENTITY_FILES.map((entity) => {
      if (!found.has(entity)) {
        throw new Error(
          `Missing nusea.documents row for "${entity}". Run pnpm db:setup.`,
        );
      }
      return [
        entity,
        fileSchemas[entity].parse(found.get(entity)),
      ] as const;
    });
    return Object.fromEntries(entries) as DataFiles;
  }

  async versions(): Promise<Record<EntityFile, string>> {
    const { rows } = await this.pool.query<{ entity: EntityFile; updated_at: string }>(
      "select entity, updated_at::text as updated_at from nusea.documents",
    );
    return Object.fromEntries(rows.map((row) => [row.entity, row.updated_at])) as Record<EntityFile, string>;
  }

  async write<K extends EntityFile>(
    entity: K,
    value: unknown,
    expectedUpdatedAt?: string,
  ): Promise<{ backupPath: string | null; value: DataFiles[K] }> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await this.writeTx(client, entity, value, expectedUpdatedAt);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async writeItemsWithHistory(nextItems: ResearchItem[], expectedUpdatedAt?: string): Promise<{
    backupPath: string | null;
    value: ResearchItem[];
    entries: HistoryEntry[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const items = await this.readForUpdateTx(client, "items");
      if (expectedUpdatedAt !== undefined && items.updatedAt !== expectedUpdatedAt) throw new ConflictError();
      const history = await this.readForUpdateTx(client, "history");
      const previousById = new Map(items.value.map((item) => [item.id, item]));
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
            note: "Status changed from the admin form.",
          }),
        ];
      });

      const write = await this.writeTx(client, "items", nextItems, items.updatedAt);
      if (entries.length > 0) {
        await this.writeTx(client, "history", [...history.value, ...entries], history.updatedAt);
      }
      await client.query("commit");
      return { backupPath: write.backupPath, value: write.value, entries };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async transitionItemStatus(
    itemId: string,
    toStatus: ResearchStatus,
    note = "Moved from the kanban.",
    expectedUpdatedAt?: string,
  ): Promise<{ item: ResearchItem; entry: HistoryEntry }> {
    if (!(ALL_STATUSES as readonly string[]).includes(toStatus)) {
      throw new Error(`Unknown status: ${toStatus}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const items = await this.readForUpdateTx(client, "items");
      if (expectedUpdatedAt !== undefined && items.updatedAt !== expectedUpdatedAt) throw new ConflictError();
      const index = items.value.findIndex((item) => item.id === itemId);
      if (index === -1) throw new Error(`Research item not found: ${itemId}`);

      const current = items.value[index];
      const now = new Date().toISOString();
      const item: ResearchItem = {
        ...current,
        status: toStatus,
        updatedAt: now,
        progressPct: statusProgress(toStatus, current.progressPct),
      };

      const history = await this.readForUpdateTx(client, "history");
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

      const nextItems = items.value.map((value, position) =>
        position === index ? item : value,
      );

      await this.writeTx(client, "items", nextItems, items.updatedAt);
      await this.writeTx(client, "history", [...history.value, entry], history.updatedAt);
      await client.query("commit");

      return { item, entry };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async listBackups(): Promise<BackupEntry[]> {
    const { rows } = await this.pool.query<{ id: string; entity: string; created_at: Date; size: number }>(
      `select id, entity, created_at, octet_length(value::text) as size
       from nusea.document_backups
       order by created_at desc, id desc`,
    );
    return rows.map((row) => ({
      name: backupName(row.entity, row.id, new Date(row.created_at)),
      size: Number(row.size),
      modifiedAt: new Date(row.created_at).toISOString(),
    }));
  }

  async readBackup(name: string): Promise<string> {
    const match = BACKUP_NAME.exec(name);
    if (!match) throw new Error("Invalid backup name.");
    const entity = name.split(".")[0];
    const { rows } = await this.pool.query<{ value: unknown }>(
      `select value from nusea.document_backups where id = $1 and entity = $2`,
      [match[1], entity],
    );
    if (rows.length === 0) throw new Error("Backup not found.");
    return JSON.stringify(rows[0]!.value);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
