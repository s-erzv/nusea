import { useMemo, useState } from "react";
import { PRIORITY_LABELS } from "../../shared/constants";
import { taskSchema, type Task } from "../../shared/schemas";
import { taskFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { daysUntil, formatDate, nowIso, todayIso, uid } from "../lib/helpers";

interface TasksPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function TasksPage({ data, saveEntity, notify }: TasksPageProps) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDue, setQuickDue] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const today = todayIso();

  const filtered = useMemo(
    () =>
      data.tasks
        .filter((task) => {
          if (statusFilter === "open") return !task.done;
          if (statusFilter === "done") return task.done;
          return true;
        })
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          if (!a.dueAt && !b.dueAt) return b.updatedAt.localeCompare(a.updatedAt);
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return a.dueAt.localeCompare(b.dueAt);
        }),
    [data.tasks, statusFilter],
  );

  const openTasks = data.tasks.filter((task) => !task.done);
  const dueToday = openTasks.filter((task) => task.dueAt === today);
  const overdue = openTasks.filter((task) => task.dueAt && task.dueAt < today);

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("tugas"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      title: "",
      dueAt: today,
      done: false,
      itemId: "",
      priority: "medium",
      notes: "",
    });
    setIsNew(true);
  }

  async function save(value: Task) {
    const at = nowIso();
    const next = isNew
      ? [...data.tasks, { ...value, createdAt: at, updatedAt: at }]
      : data.tasks.map((task) =>
          task.id === value.id ? { ...value, updatedAt: at } : task,
        );
    const backup = await saveEntity("tasks", next);
    setEditing(null);
    notify(isNew ? "Tugas baru disimpan." : `Tugas disimpan.${backup ? ` Backup: ${backup}` : ""}`);
  }

  async function toggle(task: Task) {
    const at = nowIso();
    const next = data.tasks.map((entry) =>
      entry.id === task.id ? { ...entry, done: !entry.done, updatedAt: at } : entry,
    );
    await saveEntity("tasks", next);
    notify(task.done ? "Tugas dibuka lagi." : "Tugas ditandai selesai.");
  }

  async function remove(task: Task) {
    if (!window.confirm(`Hapus tugas "${task.title}"?`)) return;
    await saveEntity(
      "tasks",
      data.tasks.filter((entry) => entry.id !== task.id),
    );
    notify("Tugas dihapus.");
  }

  async function quickAdd() {
    const title = quickTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const now = nowIso();
      const next: Task = {
        id: uid("tugas"),
        createdAt: now,
        updatedAt: now,
        visibility: "private",
        title,
        dueAt: quickDue,
        done: false,
        itemId: "",
        priority: "medium",
        notes: "",
      };
      await saveEntity("tasks", [...data.tasks, next]);
      setQuickTitle("");
      notify("Tugas cepat ditambahkan.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menambah tugas.", "error");
    } finally {
      setBusy(false);
    }
  }

  const itemTitle = (id: string) =>
    data.items.find((item) => item.id === id)?.title ?? "";

  return (
    <div>
      <PageHeader
        kicker="Kerja / Tugas"
        title="Daftar tugas"
        description="Tugas hari ini, jatuh tempo, dan tindak lanjut. Terkait riset bila perlu."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + TUGAS BARU
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel title="Hari ini">
          <p className="text-[24px] text-orange">{dueToday.length}</p>
        </Panel>
        <Panel title="Lewat tenggat">
          <p className="text-[24px]" style={{ color: overdue.length ? "var(--danger)" : undefined }}>
            {overdue.length}
          </p>
        </Panel>
        <Panel title="Belum selesai">
          <p className="text-[24px]">{openTasks.length}</p>
        </Panel>
      </div>

      <Panel title="Tambah cepat">
        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void quickAdd();
          }}
        >
          <input
            className="pixel-input admin-input"
            placeholder="Judul tugas…"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            aria-label="Judul tugas cepat"
          />
          <input
            type="date"
            className="pixel-input admin-input"
            value={quickDue}
            onChange={(event) => setQuickDue(event.target.value)}
            aria-label="Jatuh tempo tugas cepat"
          />
          <button type="submit" className="pixel-btn" disabled={busy || !quickTitle.trim()}>
            {busy ? "…" : "TAMBAH"}
          </button>
        </form>
      </Panel>

      {editing ? (
        <div className="mt-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Tugas baru" : "Edit tugas"}
            initial={editing}
            fields={taskFields(data, isNew)}
            schema={taskSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel
        title={`Daftar tugas (${filtered.length}/${data.tasks.length})`}
        actions={
          <select
            className="pixel-input admin-input admin-input-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status tugas"
          >
            <option value="all">Semua</option>
            <option value="open">Belum selesai</option>
            <option value="done">Selesai</option>
          </select>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmpty>Tidak ada tugas.</AdminEmpty>
        ) : (
          <ul className="divide-y-2 divide-line">
            {filtered.map((task) => {
              const days = daysUntil(task.dueAt);
              const isOverdue = !task.done && task.dueAt && task.dueAt < today;
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--orange)]"
                    checked={task.done}
                    onChange={() => void toggle(task)}
                    aria-label={`Tandai ${task.title} ${task.done ? "belum selesai" : "selesai"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={task.done ? "line-through opacity-60" : "font-bold"}>
                      {task.title}
                    </p>
                    <p className="mt-1 text-[15px] text-muted">
                      {task.dueAt ? `Tenggat ${formatDate(task.dueAt)}` : "Tanpa tenggat"}
                      {days !== null && !task.done
                        ? ` · ${days < 0 ? `${Math.abs(days)} hari lewat` : days === 0 ? "hari ini" : `${days} hari lagi`}`
                        : ""}
                      {` · ${PRIORITY_LABELS[task.priority]}`}
                    </p>
                    {task.itemId ? (
                      <p className="text-[15px] leading-tight text-muted">
                        {itemTitle(task.itemId)}
                      </p>
                    ) : null}
                    {task.notes ? (
                      <p className="mt-1 text-[15px] leading-snug text-muted">{task.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {isOverdue ? <span className="admin-pill" data-public={false}>Lewat</span> : null}
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() => {
                        setEditing(task);
                        setIsNew(false);
                      }}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="admin-mini-btn admin-mini-danger"
                      onClick={() => void remove(task)}
                    >
                      HAPUS
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
