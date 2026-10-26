import { useMemo, useState } from "react";
import { itemSchema, type ResearchItem } from "../../shared/schemas";
import { ITEM_TYPE_LABELS, STATUS_LABELS } from "../../shared/constants";
import { itemFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import {
  formatDate,
  nowIso,
  slugify,
  statusOptions,
  typeOptions,
  uid,
  visibilityOptions,
} from "../lib/helpers";

interface ItemsPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function ItemsPage({ data, saveEntity, notify }: ItemsPageProps) {
  const [editing, setEditing] = useState<ResearchItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.items
      .filter((item) =>
        needle
          ? `${item.title} ${item.id} ${item.keywords.join(" ")}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter(
        (item) => visibilityFilter === "all" || item.visibility === visibilityFilter,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.items, query, statusFilter, typeFilter, visibilityFilter]);

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("riset"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      title: "",
      type: "paper_jurnal",
      status: "draft",
      stageNote: "perlu dicek",
      abstract: "",
      keywords: [],
      authors: data.profile.name ? [data.profile.name] : [],
      advisors: [],
      venueId: "",
      submittedAt: "",
      decisionAt: "",
      publishedAt: "",
      doi: "",
      publicUrl: "",
      priority: "medium",
      progressPct: 0,
      pinned: false,
      submitChecklist: { plagiarismChecked: false, finalFileReady: false },
    });
    setIsNew(true);
  }

  async function save(value: ResearchItem) {
    const duplicate = data.items.some(
      (item) => item.id === value.id && (!isNew || item.id !== editing?.id),
    );
    if (isNew && duplicate) {
      throw new Error(`ID "${value.id}" sudah dipakai.`);
    }
    if (isNew && slugify(value.id) !== value.id) {
      throw new Error("ID baru harus berupa slug huruf kecil, angka, dan tanda hubung.");
    }
    const at = nowIso();
    const next = isNew
      ? [...data.items, { ...value, createdAt: at, updatedAt: at }]
      : data.items.map((item) =>
          item.id === value.id ? { ...value, updatedAt: at } : item,
        );
    const backup = await saveEntity("items", next);
    setEditing(null);
    notify(
      isNew
        ? "Riset baru disimpan."
        : `Riset disimpan.${backup ? ` Backup: ${backup}` : ""}`,
    );
  }

  async function remove(item: ResearchItem) {
    if (!window.confirm(`Hapus riset "${item.title}"? Backup dibuat sebelum menghapus.`)) {
      return;
    }
    const next = data.items.filter((entry) => entry.id !== item.id);
    await saveEntity("items", next);
    notify("Riset dihapus.");
  }

  return (
    <div>
      <PageHeader
        kicker="CRUD / Riset"
        title="Kelola riset"
        description="Semua field termasuk catatan tahap dan checklist privat tersimpan di data/private/items.json."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + RISET BARU
          </button>
        }
      />

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Riset baru" : `Edit: ${editing.title}`}
            initial={editing}
            fields={itemFields(data, isNew)}
            schema={itemSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel
        title={`Daftar riset (${filtered.length}/${data.items.length})`}
        actions={
          <span className="text-[16px] text-muted">
            {data.items.filter((item) => item.visibility === "public").length} publik
          </span>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            className="pixel-input admin-input"
            placeholder="Cari judul, ID, kata kunci…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Cari riset"
          />
          <select
            className="pixel-input admin-input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter jenis"
          >
            <option value="all">Semua jenis</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="pixel-input admin-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status"
          >
            <option value="all">Semua status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="pixel-input admin-input"
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
            aria-label="Filter visibilitas"
          >
            <option value="all">Semua visibilitas</option>
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty>Tidak ada riset yang cocok.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Visibilitas</th>
                  <th>Diperbarui</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-bold leading-tight">{item.title}</p>
                      <p className="text-[15px] text-muted">{item.id}</p>
                    </td>
                    <td>{ITEM_TYPE_LABELS[item.type]}</td>
                    <td>{STATUS_LABELS[item.status]}</td>
                    <td>
                      <span className="admin-pill" data-public={item.visibility === "public"}>
                        {item.visibility === "public" ? "Publik" : "Privat"}
                      </span>
                    </td>
                    <td>{formatDate(item.updatedAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={() => {
                            setEditing(item);
                            setIsNew(false);
                          }}
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          className="admin-mini-btn admin-mini-danger"
                          onClick={() => void remove(item)}
                        >
                          HAPUS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
