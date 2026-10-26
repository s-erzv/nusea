import { useState } from "react";
import {
  ITEM_TYPE_LABELS,
  PIPELINE_STATUSES,
  STATUS_LABELS,
  STATUS_NUMBERS,
  TERMINAL_STATUSES,
  type ResearchStatus,
} from "../../shared/constants";

import { adminApi } from "../lib/api";
import { statusOptions } from "../lib/helpers";
import { PageHeader } from "../components/layout";
import type { AdminData, Notify } from "../lib/types";
import { statusProgress } from "../../shared/status";

interface KanbanPageProps {
  data: AdminData;
  refresh: () => Promise<void>;
  notify: Notify;
}

export function KanbanPage({ data, refresh, notify }: KanbanPageProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function move(itemId: string, toStatus: ResearchStatus) {
    if (busy) return;
    const item = data.items.find((entry) => entry.id === itemId);
    if (!item || item.status === toStatus) return;
    setBusy(itemId);
    try {
      await adminApi.transition(itemId, toStatus, "Dipindahkan dari kanban.");
      await refresh();
      notify(`${item.title} → ${STATUS_LABELS[toStatus]}. Riwayat tercatat.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal memindahkan status.", "error");
    } finally {
      setBusy(null);
      setDragging(null);
      setOverColumn(null);
    }
  }

  function Column({
    status,
    terminal = false,
  }: {
    status: ResearchStatus;
    terminal?: boolean;
  }) {
    const items = data.items
      .filter((item) => item.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const isOver = overColumn === status;
    return (
      <section
        className={`admin-kanban-col ${isOver ? "is-over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOverColumn(status);
        }}
        onDragLeave={() => setOverColumn(null)}
        onDrop={(event) => {
          event.preventDefault();
          const id = event.dataTransfer.getData("text/plain") || dragging;
          if (id) void move(id, status);
        }}
        aria-label={`Kolom ${STATUS_LABELS[status]}`}
      >
        <header className="admin-kanban-head">
          <div>
            <p className="font-pixel text-[7px] uppercase leading-4 text-muted">
              {terminal ? "Terminal" : `Level ${STATUS_NUMBERS[status as keyof typeof STATUS_NUMBERS] ?? "—"}`}
            </p>
            <h2 className="text-[12px] leading-5">{STATUS_LABELS[status]}</h2>
          </div>
          <span className="admin-count">{items.length}</span>
        </header>
        <div className="space-y-2 p-2">
          {items.map((item) => (
            <article
              key={item.id}
              draggable={!busy}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", item.id);
                event.dataTransfer.effectAllowed = "move";
                setDragging(item.id);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOverColumn(null);
              }}
              className={`admin-kanban-card ${dragging === item.id ? "is-dragging" : ""}`}
            >
              <p className="text-[16px] font-bold leading-tight">{item.title}</p>
              <p className="mt-1 text-[15px] text-muted">
                {ITEM_TYPE_LABELS[item.type]} · {statusProgress(item.status, item.progressPct)}% XP
              </p>
              <div className="mt-2 h-2 border-2 border-line bg-paper">
                <div
                  className="h-full bg-orange"
                  style={{ width: `${statusProgress(item.status, item.progressPct)}%` }}
                />
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Pindahkan status {item.title}</span>
                <select
                  className="pixel-input admin-input admin-input-xs"
                  value={item.status}
                  disabled={busy === item.id}
                  onChange={(event) =>
                    void move(item.id, event.target.value as ResearchStatus)
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
          {items.length === 0 ? (
            <p className="border-2 border-dashed border-line px-2 py-4 text-center text-[15px] text-muted">
              Kosong
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="Kanban pipeline"
        description="Tarik kartu ke kolom lain, atau pakai pilihan status untuk keyboard. Setiap perubahan otomatis menulis data/private/history.json."
      />

      <div className="admin-kanban-wrap">
        {PIPELINE_STATUSES.map((status) => (
          <Column key={status} status={status} />
        ))}
      </div>

      <h2 className="mt-8 text-[16px]">Status terminal</h2>
      <div className="admin-kanban-wrap mt-3">
        {TERMINAL_STATUSES.map((status) => (
          <Column key={status} status={status} terminal />
        ))}
      </div>
    </div>
  );
}
