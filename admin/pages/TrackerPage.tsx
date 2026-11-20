import { Fragment, useMemo, useState } from "react";
import {
  ALL_STATUSES,
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  DATA_SOURCE_LABELS,
  DATA_SOURCES,
  ITEM_ROLES,
  ITEM_ROLE_LABELS,
  RESEARCH_KINDS,
  RESEARCH_KIND_LABELS,
  STATUS_LABELS,
  type AssetKind,
  type ResearchStatus,
} from "../../shared/constants";
import type { Asset, ResearchItem } from "../../shared/schemas";
import { AdminEmpty, PageHeader } from "../components/layout";
import { PaperclipIcon, PlusIcon, TrashIcon } from "../components/icons";
import { adminApi, ApiError } from "../lib/api";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { formatDate, nowIso, uid } from "../lib/helpers";
import { KanbanPage } from "./KanbanPage";

interface TrackerPageProps {
  data: AdminData;
  refresh: () => Promise<void>;
  notify: Notify;
  versions?: Record<string, string>;
  saveEntity: SaveEntity;
}

type SortKey = "trackerId" | "title" | "status" | "targetDate" | "updatedAt";

function sortValue(item: ResearchItem, key: SortKey): string {
  if (key === "trackerId") return item.trackerId || item.id;
  if (key === "title") return item.title;
  if (key === "status") return String(ALL_STATUSES.indexOf(item.status));
  if (key === "targetDate") return item.targetDate;
  return item.updatedAt;
}

function splitAuthors(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function guessKind(url: string): AssetKind {
  const lower = url.toLowerCase();
  if (lower.includes("drive.google.com")) return "drive";
  if (lower.includes("docs.google.com/spreadsheets")) return "sheets";
  if (lower.includes("docs.google.com/document")) return "docs";
  if (lower.includes("overleaf.com")) return "overleaf";
  if (lower.includes("github.com")) return "github";
  if (lower.includes("figma.com")) return "figma";
  if (lower.includes(".pdf")) return "pdf";
  if (lower.includes("claude.ai") || lower.includes("notion.")) return "docs";
  return "lainnya";
}

function CellInput({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="sheet-input"
      value={draft}
      placeholder={placeholder}
      title={value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onCommit(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function CellArea({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <textarea
      className="sheet-input sheet-area"
      rows={2}
      value={draft}
      title={value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onCommit(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

const COLUMNS = [
  "#",
  "Judul",
  "Peran saya",
  "Status",
  "Jenis",
  "Target jurnal / venue",
  "Co-author (urutan)",
  "Terbit / tenggat",
  "Langkah berikutnya",
  "Link",
  "Sumber data",
  "Catatan",
  "Aksi",
];

export function TrackerPage({
  data,
  refresh,
  notify,
  versions,
  saveEntity,
}: TrackerPageProps) {
  const [view, setView] = useState<"sheet" | "kanban">("sheet");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("trackerId");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [assetDraft, setAssetDraft] = useState({
    label: "",
    url: "",
    kind: "drive" as AssetKind,
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.items
      .filter((item) =>
        needle
          ? `${item.trackerId} ${item.id} ${item.title} ${item.targetVenue} ${item.authors.join(" ")} ${item.notes}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => roleFilter === "all" || item.role === roleFilter)
      .filter(
        (item) => kindFilter === "all" || item.researchKind === kindFilter,
      )
      .filter(
        (item) => sourceFilter === "all" || item.dataSource === sourceFilter,
      )
      .sort(
        (a, b) =>
          sortValue(a, sortKey).localeCompare(sortValue(b, sortKey), "id", {
            numeric: true,
          }) * sortDir,
      );
  }, [
    data.items,
    query,
    statusFilter,
    roleFilter,
    kindFilter,
    sourceFilter,
    sortKey,
    sortDir,
  ]);

  async function addItem() {
    if (busy) return;
    const now = nowIso();
    const numbers = data.items
      .map((item) => /^T(\d+)$/.exec(item.trackerId)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number);
    const nextNumber = String(Math.max(0, ...numbers) + 1).padStart(2, "0");
    const item: ResearchItem = {
      id: uid("riset"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      title: "Penelitian baru",
      type: "paper_jurnal",
      status: "ide",
      stageNote: "",
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
      trackerId: `T${nextNumber}`,
      role: "penulis_1",
      researchKind: "belum_dicatat",
      targetVenue: "",
      targetDate: "",
      nextStep: "",
      dataSource: "belum_dicatat",
      link: "",
      notes: "",
    };
    setBusy(item.id);
    try {
      await saveEntity("items", [...data.items, item]);
      setOpenId(item.id);
      notify("Penelitian baru dibuat. Ganti judul dan isi kolomnya.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Gagal menambah penelitian.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(item: ResearchItem) {
    if (
      !window.confirm(
        `Hapus "${item.title}"? Backup data tetap dibuat di Neon.`,
      )
    ) {
      return;
    }
    setBusy(item.id);
    try {
      await saveEntity(
        "items",
        data.items.filter((entry) => entry.id !== item.id),
      );
      if (openId === item.id) setOpenId(null);
      notify("Penelitian dihapus.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Gagal menghapus penelitian.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  function assetsFor(itemId: string): Asset[] {
    return data.assets.filter((asset) => asset.itemIds.includes(itemId));
  }

  async function saveFields(
    item: ResearchItem,
    patch: Partial<ResearchItem>,
    message = "Tersimpan.",
  ) {
    if (busy) return;
    setBusy(item.id);
    try {
      const next = data.items.map((entry) =>
        entry.id === item.id
          ? { ...entry, ...patch, updatedAt: nowIso() }
          : entry,
      );
      await saveEntity("items", next);
      notify(message);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Gagal menyimpan baris ini.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(item: ResearchItem, status: ResearchStatus) {
    if (busy || item.status === status) return;
    setBusy(item.id);
    try {
      await adminApi.transition(
        item.id,
        status,
        "Changed from the tracker.",
        versions?.items,
      );
      await refresh();
      notify(`${item.title} → ${STATUS_LABELS[status]}.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await refresh();
        notify("Data berubah di tempat lain. Sudah dimuat ulang.", "error");
      } else {
        notify(
          error instanceof Error ? error.message : "Gagal mengubah status.",
          "error",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function addAsset(item: ResearchItem) {
    const url = assetDraft.url.trim();
    if (!url) {
      notify("URL dokumen wajib diisi.", "error");
      return;
    }
    setBusy(item.id);
    try {
      const at = nowIso();
      const asset: Asset = {
        id: uid("asset"),
        createdAt: at,
        updatedAt: at,
        visibility: "private",
        kind: assetDraft.kind,
        label: assetDraft.label.trim() || url,
        url,
        localPath: "",
        itemIds: [item.id],
        tags: [],
        isPrimary: false,
        note: "",
      };
      await saveEntity("assets", [...data.assets, asset]);
      setAssetDraft({ label: "", url: "", kind: "drive" });
      notify("Dokumen ditambahkan ke baris ini.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Gagal menambah dokumen.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeAsset(asset: Asset) {
    if (!window.confirm(`Hapus dokumen "${asset.label}"? Backup tetap dibuat.`)) {
      return;
    }
    try {
      await saveEntity(
        "assets",
        data.assets.filter((entry) => entry.id !== asset.id),
      );
      notify("Dokumen dihapus.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Gagal menghapus dokumen.",
        "error",
      );
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Research / Tracker"
        title="Tracker penelitian"
        description="Spreadsheet semua paper. Klik sel untuk edit, Enter untuk simpan. Tombol Dokumen membuka link dan file tiap baris."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => void addItem()}
              disabled={Boolean(busy)}
              aria-label="Tambah penelitian"
              title="Tambah penelitian"
            >
              <PlusIcon size={20} />
            </button>
            <div className="tracker-view-toggle">
            <button
              type="button"
              data-active={view === "sheet"}
              onClick={() => setView("sheet")}
            >
              SPREADSHEET
            </button>
            <button
              type="button"
              data-active={view === "kanban"}
              onClick={() => setView("kanban")}
            >
              KANBAN
            </button>
          </div>
          </div>
        }
      />

      {view === "kanban" ? (
        <KanbanPage
          data={data}
          refresh={refresh}
          notify={notify}
          versions={versions}
        />
      ) : (
        <>
          <div className="tracker-toolbar sheet-toolbar">
            <input
              type="search"
              className="pixel-input admin-input tracker-search"
              placeholder="Cari judul, ID, venue, catatan…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Cari tracker"
            />
            <select
              className="pixel-input admin-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              className="pixel-input admin-input"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="Filter peran"
            >
              <option value="all">Semua peran</option>
              {ITEM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ITEM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select
              className="pixel-input admin-input"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
              aria-label="Filter jenis"
            >
              <option value="all">Semua jenis</option>
              {RESEARCH_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {RESEARCH_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <select
              className="pixel-input admin-input"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              aria-label="Filter sumber data"
            >
              <option value="all">Semua sumber</option>
              {DATA_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {DATA_SOURCE_LABELS[source]}
                </option>
              ))}
            </select>
            <select
              className="pixel-input admin-input"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              aria-label="Urutkan"
            >
              <option value="trackerId">Urut: ID</option>
              <option value="title">Urut: Judul</option>
              <option value="status">Urut: Status</option>
              <option value="targetDate">Urut: Tanggal</option>
              <option value="updatedAt">Urut: Diubah</option>
            </select>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost admin-topbar-btn"
              onClick={() => setSortDir((dir) => (dir === 1 ? -1 : 1))}
            >
              {sortDir === 1 ? "A→Z" : "Z→A"}
            </button>
          </div>

          {filtered.length === 0 ? (
            <AdminEmpty>Tidak ada baris yang cocok.</AdminEmpty>
          ) : (
            <div className="sheet-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, rowIndex) => {
                    const isOpen = openId === item.id;
                    const assets = assetsFor(item.id);
                    const linkCount = assets.length + (item.link ? 1 : 0);
                    return (
                      <Fragment key={item.id}>
                        <tr
                          data-unverified={item.dataSource === "perlu_dicek"}
                          data-busy={busy === item.id}
                        >
                          <td
                            className="sheet-sticky sheet-col-id"
                            title={item.trackerId || item.id}
                          >
                            <span className="sheet-id">{rowIndex + 1}</span>
                          </td>
                          <td className="sheet-sticky sheet-col-title">
                            <CellArea
                              value={item.title}
                              onCommit={(next) =>
                                next && next !== item.title
                                  ? void saveFields(item, { title: next })
                                  : undefined
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              data-value={item.role}
                              value={item.role}
                              disabled={busy === item.id}
                              onChange={(event) =>
                                void saveFields(item, {
                                  role: event.target.value as ResearchItem["role"],
                                })
                              }
                              aria-label={`Peran ${item.title}`}
                            >
                              {ITEM_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ITEM_ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              data-value={item.status}
                              value={item.status}
                              disabled={busy === item.id}
                              onChange={(event) =>
                                void changeStatus(
                                  item,
                                  event.target.value as ResearchStatus,
                                )
                              }
                              aria-label={`Status ${item.title}`}
                            >
                              {ALL_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              data-value={item.researchKind}
                              value={item.researchKind}
                              disabled={busy === item.id}
                              onChange={(event) =>
                                void saveFields(item, {
                                  researchKind: event.target
                                    .value as ResearchItem["researchKind"],
                                })
                              }
                              aria-label={`Jenis ${item.title}`}
                            >
                              {RESEARCH_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {RESEARCH_KIND_LABELS[kind]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <CellInput
                              value={item.targetVenue}
                              onCommit={(next) =>
                                void saveFields(item, { targetVenue: next })
                              }
                            />
                          </td>
                          <td>
                            <CellInput
                              value={item.authors.join("; ")}
                              onCommit={(next) =>
                                void saveFields(item, {
                                  authors: splitAuthors(next),
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="sheet-input"
                              value={item.targetDate}
                              disabled={busy === item.id}
                              onChange={(event) =>
                                void saveFields(item, {
                                  targetDate: event.target.value,
                                })
                              }
                              aria-label={`Terbit atau tenggat ${item.title}`}
                            />
                            <span className="sheet-date">
                              {item.targetDate ? formatDate(item.targetDate) : ""}
                            </span>
                          </td>
                          <td>
                            <CellArea
                              value={item.nextStep}
                              onCommit={(next) =>
                                void saveFields(item, { nextStep: next })
                              }
                            />
                          </td>
                          <td>
                            <CellInput
                              value={item.link}
                              placeholder="https://…"
                              onCommit={(next) =>
                                void saveFields(item, { link: next })
                              }
                            />
                            {item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="sheet-link"
                              >
                                buka ↗
                              </a>
                            ) : null}
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              data-value={item.dataSource}
                              value={item.dataSource}
                              disabled={busy === item.id}
                              onChange={(event) =>
                                void saveFields(item, {
                                  dataSource: event.target
                                    .value as ResearchItem["dataSource"],
                                })
                              }
                              aria-label={`Sumber data ${item.title}`}
                            >
                              {DATA_SOURCES.map((source) => (
                                <option key={source} value={source}>
                                  {DATA_SOURCE_LABELS[source]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <CellArea
                              value={item.notes}
                              onCommit={(next) =>
                                void saveFields(item, { notes: next })
                              }
                            />
                          </td>
                          <td className="sheet-col-docs">
                            <div className="sheet-actions">
                              <button
                                type="button"
                                className="sheet-icon-btn"
                                data-open={isOpen}
                                onClick={() => setOpenId(isOpen ? null : item.id)}
                                aria-expanded={isOpen}
                                aria-label={`Dokumen ${item.title}`}
                                title="Dokumen dan link"
                              >
                                <PaperclipIcon />
                                <span>{linkCount}</span>
                              </button>
                              <button
                                type="button"
                                className="sheet-icon-btn is-danger"
                                onClick={() => void removeItem(item)}
                                disabled={busy === item.id}
                                aria-label={`Hapus ${item.title}`}
                                title="Hapus penelitian"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isOpen ? (
                          <tr className="sheet-detail-row">
                            <td colSpan={COLUMNS.length}>
                              <div className="sheet-detail">
                                <div className="sheet-detail-head">
                                  <h3>Dokumen & link — {item.title}</h3>
                                  <span>{item.id}</span>
                                </div>

                                <div className="tracker-links">
                                  {item.publicUrl ? (
                                    <a
                                      href={item.publicUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="tracker-link-chip"
                                    >
                                      <span className="tracker-link-kind">
                                        PUBLIK
                                      </span>
                                      <span>Halaman publik</span>
                                      <span aria-hidden="true">↗</span>
                                    </a>
                                  ) : null}
                                  {item.doi ? (
                                    <a
                                      href={`https://doi.org/${item.doi}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="tracker-link-chip"
                                    >
                                      <span className="tracker-link-kind">DOI</span>
                                      <span>{item.doi}</span>
                                      <span aria-hidden="true">↗</span>
                                    </a>
                                  ) : null}
                                  {assets.map((asset) => (
                                    <div
                                      key={asset.id}
                                      className="tracker-link-chip"
                                    >
                                      <span className="tracker-link-kind">
                                        {ASSET_KIND_LABELS[asset.kind]}
                                      </span>
                                      <a
                                        href={asset.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {asset.label}
                                      </a>
                                      <button
                                        type="button"
                                        className="tracker-link-remove"
                                        onClick={() => void removeAsset(asset)}
                                        aria-label={`Hapus ${asset.label}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  {!item.publicUrl && !item.doi && assets.length === 0 ? (
                                    <p className="tracker-muted">
                                      Belum ada dokumen. Tambahkan URL di bawah
                                      atau isi kolom Link.
                                    </p>
                                  ) : null}
                                </div>

                                <form
                                  className="tracker-asset-form"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    void addAsset(item);
                                  }}
                                >
                                  <input
                                    className="pixel-input admin-input"
                                    placeholder="Nama dokumen"
                                    value={assetDraft.label}
                                    onChange={(event) =>
                                      setAssetDraft((draft) => ({
                                        ...draft,
                                        label: event.target.value,
                                      }))
                                    }
                                    aria-label="Nama dokumen"
                                  />
                                  <input
                                    className="pixel-input admin-input"
                                    placeholder="https://drive.google.com/…"
                                    value={assetDraft.url}
                                    onChange={(event) =>
                                      setAssetDraft((draft) => ({
                                        ...draft,
                                        url: event.target.value,
                                        kind: guessKind(event.target.value),
                                      }))
                                    }
                                    aria-label="URL dokumen"
                                  />
                                  <select
                                    className="pixel-input admin-input"
                                    value={assetDraft.kind}
                                    onChange={(event) =>
                                      setAssetDraft((draft) => ({
                                        ...draft,
                                        kind: event.target.value as AssetKind,
                                      }))
                                    }
                                    aria-label="Jenis dokumen"
                                  >
                                    {ASSET_KINDS.map((kind) => (
                                      <option key={kind} value={kind}>
                                        {ASSET_KIND_LABELS[kind]}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="pixel-btn admin-icon-btn"
                                    disabled={
                                      busy === item.id || !assetDraft.url.trim()
                                    }
                                    aria-label="Tambah dokumen"
                                    title="Tambah dokumen"
                                  >
                                    <PlusIcon size={20} />
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
