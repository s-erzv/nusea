import { useEffect, useState } from "react";
import type { EntityFile, Grant, ResearchItem } from "../../shared/schemas";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { adminApi } from "../lib/api";
import {
  csvToRecords,
  parseBoolean,
  parseList,
  parseNumber,
  serializeCsv,
} from "../lib/csv";
import type { AdminData, BackupEntry, Notify, SaveEntity } from "../lib/types";
import { formatDate, nowIso, slugify, todayIso } from "../lib/helpers";

interface DataPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
  refresh: () => Promise<void>;
}

const FILE_LABELS: Record<EntityFile, string> = {
  profile: "profile.json",
  items: "items.json",
  assets: "assets.json",
  venues: "venues.json",
  sources: "sources.json",
  grants: "grants.json",
  ideas: "ideas.json",
  tasks: "tasks.json",
  history: "history.json",
};

const ITEM_COLUMNS = [
  "id",
  "title",
  "type",
  "status",
  "visibility",
  "venueId",
  "doi",
  "publicUrl",
  "submittedAt",
  "decisionAt",
  "publishedAt",
  "priority",
  "progressPct",
  "pinned",
  "keywords",
  "authors",
  "advisors",
  "stageNote",
  "abstract",
  "plagiarismChecked",
  "finalFileReady",
];

const GRANT_COLUMNS = [
  "id",
  "itemId",
  "scheme",
  "cluster",
  "maxFundingIdr",
  "piName",
  "team",
  "proposalDeadline",
  "selectionStage",
  "requiredOutputs",
  "outputDeadline",
  "editionNote",
  "visibility",
];

function download(name: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function countOf(entity: EntityFile, data: AdminData): number {
  if (entity === "profile") return 1;
  return data[entity].length;
}

export function DataPage({ data, saveEntity, notify, refresh }: DataPageProps) {
  const [uploadEntity, setUploadEntity] = useState<EntityFile>("items");
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupError, setBackupError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadBackups() {
    setBackupError("");
    try {
      const result = await adminApi.backups();
      setBackups(result.backups);
    } catch (error) {
          setBackupError(
            error instanceof Error ? error.message : "Could not load backups.",
          );
    }
  }

  useEffect(() => {
    let active = true;
    adminApi
      .backups()
      .then((result) => {
        if (active) setBackups(result.backups);
      })
      .catch((error: unknown) => {
        if (active) {
      setBackupError(error instanceof Error ? error.message : "Could not load backups.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function downloadJson(entity: EntityFile) {
    download(
      `nusea-${FILE_LABELS[entity]}`,
      `${JSON.stringify(data[entity], null, 2)}\n`,
    );
  }

  async function uploadJson(file: File) {
    if (
      !window.confirm(
        `Replace the entire ${FILE_LABELS[uploadEntity]} with this file? A backup will be created automatically.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (uploadEntity !== "profile" && !Array.isArray(parsed)) {
        throw new Error("Entity files must contain a JSON array.");
      }
      await saveEntity(uploadEntity, parsed);
      await refresh();
      await loadBackups();
      notify(`${FILE_LABELS[uploadEntity]} replaced and validated.`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not upload JSON.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function exportItems() {
    const rows = data.items.map((item) => ({
      ...item,
      keywords: item.keywords,
      authors: item.authors,
      advisors: item.advisors,
      plagiarismChecked: item.submitChecklist.plagiarismChecked,
      finalFileReady: item.submitChecklist.finalFileReady,
    }));
    download(
      `nusea-items-${todayIso()}.csv`,
      serializeCsv(ITEM_COLUMNS, rows),
      "text/csv",
    );
  }

  function exportGrants() {
    download(
      `nusea-grants-${todayIso()}.csv`,
      serializeCsv(GRANT_COLUMNS, data.grants),
      "text/csv",
    );
  }

  function buildItem(record: Record<string, string>): ResearchItem {
    const now = nowIso();
    const id = record.id?.trim() || slugify(record.title ?? "");
    if (!id) throw new Error("Every row needs an id or title column.");
    const existing = data.items.find((item) => item.id === id);
    return {
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      visibility: (record.visibility || existing?.visibility || "private") as ResearchItem["visibility"],
      title: record.title || existing?.title || "",
      type: (record.type || existing?.type || "paper_jurnal") as ResearchItem["type"],
      status: (record.status || existing?.status || "draft") as ResearchItem["status"],
      stageNote: record.stageNote ?? existing?.stageNote ?? "",
      abstract: record.abstract ?? existing?.abstract ?? "",
      keywords: record.keywords !== undefined ? parseList(record.keywords) : existing?.keywords ?? [],
      authors: record.authors !== undefined ? parseList(record.authors) : existing?.authors ?? [],
      advisors: record.advisors !== undefined ? parseList(record.advisors) : existing?.advisors ?? [],
      venueId: record.venueId ?? existing?.venueId ?? "",
      submittedAt: record.submittedAt ?? existing?.submittedAt ?? "",
      decisionAt: record.decisionAt ?? existing?.decisionAt ?? "",
      publishedAt: record.publishedAt ?? existing?.publishedAt ?? "",
      doi: record.doi ?? existing?.doi ?? "",
      publicUrl: record.publicUrl ?? existing?.publicUrl ?? "",
      priority: (record.priority || existing?.priority || "medium") as ResearchItem["priority"],
      progressPct: parseNumber(record.progressPct, existing?.progressPct ?? 0),
      pinned: record.pinned !== undefined ? parseBoolean(record.pinned) : existing?.pinned ?? false,
      submitChecklist: {
        plagiarismChecked:
          record.plagiarismChecked !== undefined
            ? parseBoolean(record.plagiarismChecked)
            : existing?.submitChecklist.plagiarismChecked ?? false,
        finalFileReady:
          record.finalFileReady !== undefined
            ? parseBoolean(record.finalFileReady)
            : existing?.submitChecklist.finalFileReady ?? false,
      },
    };
  }

  function buildGrant(record: Record<string, string>): Grant {
    const now = nowIso();
    const id = record.id?.trim() || slugify(record.scheme ?? "");
    if (!id) throw new Error("Every row needs an id or scheme column.");
    const existing = data.grants.find((grant) => grant.id === id);
    return {
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      visibility: (record.visibility || existing?.visibility || "private") as Grant["visibility"],
      itemId: record.itemId ?? existing?.itemId ?? "",
      scheme: record.scheme || existing?.scheme || "",
      cluster: (record.cluster || existing?.cluster || "Pembinaan") as Grant["cluster"],
      maxFundingIdr: parseNumber(record.maxFundingIdr, existing?.maxFundingIdr ?? 0),
      piName: record.piName ?? existing?.piName ?? "",
      team: record.team !== undefined ? parseList(record.team) : existing?.team ?? [],
      proposalDeadline: record.proposalDeadline ?? existing?.proposalDeadline ?? "",
      selectionStage: (record.selectionStage || existing?.selectionStage || "persiapan") as Grant["selectionStage"],
      requiredOutputs:
        record.requiredOutputs !== undefined
          ? parseList(record.requiredOutputs)
          : existing?.requiredOutputs ?? [],
      outputDeadline: record.outputDeadline ?? existing?.outputDeadline ?? "",
      editionNote: record.editionNote ?? existing?.editionNote ?? "",
    };
  }

  async function importCsv(file: File, kind: "items" | "grants") {
    setBusy(true);
    try {
      const records = csvToRecords(await file.text());
      if (records.length === 0) {
        throw new Error("CSV is empty or no header was found.");
      }
      if (kind === "items") {
        const imported = records.map(buildItem);
        const ids = new Set<string>();
        for (const item of imported) {
          if (ids.has(item.id)) throw new Error(`Duplicate ID in CSV: ${item.id}`);
          ids.add(item.id);
        }
        if (
          !window.confirm(
            `Import ${imported.length} research rows? Rows with the same ID will be updated.`,
          )
        ) {
          return;
        }
        const next = [...data.items];
        for (const item of imported) {
          const index = next.findIndex((entry) => entry.id === item.id);
          if (index >= 0) next[index] = item;
          else next.push(item);
        }
        await saveEntity("items", next);
        notify(`${imported.length} research rows imported.`);
      } else {
        const imported = records.map(buildGrant);
        if (
          !window.confirm(
            `Import ${imported.length} grant rows? Rows with the same ID will be updated.`,
          )
        ) {
          return;
        }
        const next = [...data.grants];
        for (const grant of imported) {
          const index = next.findIndex((entry) => entry.id === grant.id);
          if (index >= 0) next[index] = grant;
          else next.push(grant);
        }
        await saveEntity("grants", next);
        notify(`${imported.length} grant rows imported.`);
      }
      await refresh();
      await loadBackups();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not import CSV.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup(name: string) {
    try {
      const text = await adminApi.backupText(name);
      download(name, text);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not download backup.",
        "error",
      );
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Data / Raw"
        title="Data and backups"
        description="Raw JSON files in data/private plus the latest 20 backups. All operations stay local."
      />

      <Panel title="Raw JSON files">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Count</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(FILE_LABELS) as EntityFile[]).map((entity) => (
                <tr key={entity}>
                  <td className="font-mono">{FILE_LABELS[entity]}</td>
                  <td>{countOf(entity, data)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() => downloadJson(entity)}
                    >
                      DOWNLOAD JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-2 border-t-2 border-dashed border-line pt-4 sm:grid-cols-[auto_1fr_auto]">
          <select
            className="pixel-input admin-input"
            value={uploadEntity}
            onChange={(event) => setUploadEntity(event.target.value as EntityFile)}
            aria-label="Entity to upload as JSON"
          >
            {(Object.keys(FILE_LABELS) as EntityFile[]).map((entity) => (
              <option key={entity} value={entity}>
                {FILE_LABELS[entity]}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="application/json,.json"
            className="pixel-input admin-input"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadJson(file);
            }}
            aria-label={`Upload JSON for ${FILE_LABELS[uploadEntity]}`}
          />
          <p className="self-center text-[15px] text-muted">
            Replaces the entire file after validation.
          </p>
        </div>
      </Panel>

      <div className="mt-5">
        <Panel title="Research and grant CSV">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-[3px] border-line bg-paper p-3">
              <h3 className="text-[16px]">Research</h3>
              <p className="mb-3 text-[15px] text-muted">
                Columns: id, title, type, status, visibility, + other fields.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-mini-btn" onClick={exportItems}>
                  EXPORT CSV
                </button>
                <label className="admin-mini-btn cursor-pointer">
                  IMPORT CSV
                  <input
                    type="file"
                    accept="text/csv,.csv"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void importCsv(file, "items");
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="border-[3px] border-line bg-paper p-3">
              <h3 className="text-[16px]">Grants</h3>
              <p className="mb-3 text-[15px] text-muted">
                Columns: id, scheme, cluster, selectionStage, + other fields.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-mini-btn" onClick={exportGrants}>
                  EXPORT CSV
                </button>
                <label className="admin-mini-btn cursor-pointer">
                  IMPORT CSV
                  <input
                    type="file"
                    accept="text/csv,.csv"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void importCsv(file, "grants");
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-snug text-muted">
            Lists use a pipe (|) separator. Rows with the same ID are updated;
            other rows stay unchanged. Every import is validated with Zod on the server.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title={`Backup (${backups.length})`}
          actions={
            <button type="button" className="admin-mini-btn" onClick={() => void loadBackups()}>
              RELOAD
            </button>
          }
        >
          {backupError ? <p className="admin-warning">{backupError}</p> : null}
          {backups.length === 0 ? (
            <AdminEmpty>
              No backups yet. A backup is created when a file is first written.
            </AdminEmpty>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Time</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.name}>
                      <td className="max-w-md break-all font-mono text-[14px]">{backup.name}</td>
                      <td>{Math.max(1, Math.round(backup.size / 1024))} KB</td>
                      <td>{formatDate(backup.modifiedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={() => void downloadBackup(backup.name)}
                        >
                          DOWNLOAD
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[15px] text-muted">
            Manual restore: download a backup, then upload it through the JSON panel above.
          </p>
        </Panel>
      </div>
    </div>
  );
}
