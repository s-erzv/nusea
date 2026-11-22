import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ALL_STATUSES,
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  DEFAULT_PUBLIC_ITEM_FIELDS,
  ITEM_ROLES,
  ITEM_ROLE_LABELS,
  RESEARCH_CATEGORIES,
  RESEARCH_CATEGORY_LABELS,
  RESEARCH_KINDS,
  RESEARCH_KIND_LABELS,
  STATUS_LABELS,
  type AssetKind,
  type ResearchStatus,
} from "../../shared/constants";
import { itemSchema, type Asset, type ResearchItem } from "../../shared/schemas";
import { AdminEmpty, PageHeader } from "../components/layout";
import { Modal } from "../components/Modal";
import { SchemaForm } from "../components/SchemaForm";
import { PencilIcon, PaperclipIcon, PlusIcon, TrashIcon } from "../components/icons";
import { itemFields } from "../forms/fields";
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

type SortKey =
  | "manual"
  | "trackerId"
  | "title"
  | "status"
  | "targetDate"
  | "updatedAt";

function sortValue(item: ResearchItem, key: SortKey): string {
  if (key === "manual") return "";
  if (key === "trackerId") return item.trackerId || item.id;
  if (key === "title") return item.title;
  if (key === "status") return String(ALL_STATUSES.indexOf(item.status));
  if (key === "targetDate") return item.targetDate;
  return item.updatedAt;
}

const BOTTOM_STATUSES = new Set<ResearchStatus>(["ditinggalkan", "diabaikan"]);

function bottomRank(item: ResearchItem): number {
  return BOTTOM_STATUSES.has(item.status) ? 1 : 0;
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
  disabled,
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <input
      className="sheet-input"
      value={draft}
      placeholder={placeholder}
      title={value}
      disabled={disabled}
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
  disabled,
}: {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  return (
    <textarea
      className="sheet-input sheet-area"
      rows={2}
      value={draft}
      title={value}
      disabled={disabled}
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
  "Title",
  "My role",
  "Status",
  "Type",
  "Category",
  "Target journal / venue",
  "Co-authors (order)",
  "Published / due",
  "Next step",
  "Link",
  "Notes",
  "Actions",
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
  const [sortKey, setSortKey] = useState<SortKey>("manual");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [assetDraft, setAssetDraft] = useState({
    label: "",
    url: "",
    kind: "drive" as AssetKind,
  });
  const [editDraft, setEditDraft] = useState<ResearchItem | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ResearchItem | null>(null);
  const [pendingAssetDelete, setPendingAssetDelete] = useState<Asset | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{
    id: string;
    after: boolean;
  } | null>(null);

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
      .sort((a, b) => {
        const bottom = bottomRank(a) - bottomRank(b);
        if (bottom !== 0) return bottom;
        return (
          sortValue(a, sortKey).localeCompare(sortValue(b, sortKey), "id", {
            numeric: true,
          }) * sortDir
        );
      });
  }, [
    data.items,
    query,
    statusFilter,
    roleFilter,
    kindFilter,
    sortKey,
    sortDir,
  ]);

  const locked = Boolean(busy) || deleteBusy || editSaving;

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
      title: "New research",
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
      researchCategory: "belum_dicatat",
      targetVenue: "",
      targetDate: "",
      nextStep: "",
      dataSource: "belum_dicatat",
      link: "",
      notes: "",
      detail: "",
      publicFields: [...DEFAULT_PUBLIC_ITEM_FIELDS],
    };
    setBusy(item.id);
    try {
      await saveEntity("items", [...data.items, item]);
      setOpenId(item.id);
      notify("New research created. Rename it and fill in the columns.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not add research.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  function removeItem(item: ResearchItem) {
    setPendingDelete(item);
  }

  async function confirmRemoveItem() {
    if (!pendingDelete || deleteBusy) return;
    const item = pendingDelete;
    setDeleteBusy(true);
    setBusy(item.id);
    try {
      await saveEntity(
        "items",
        data.items.filter((entry) => entry.id !== item.id),
      );
      if (openId === item.id) setOpenId(null);
      setPendingDelete(null);
      notify("Research deleted. A backup was still saved in Neon.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not delete research.",
        "error",
      );
    } finally {
      setDeleteBusy(false);
      setBusy(null);
    }
  }

  function startEdit(item: ResearchItem) {
    setEditErrors({});
    setEditDraft({ ...item });
  }

  async function reorderItems(
    movedId: string,
    targetId: string,
    after: boolean,
  ) {
    if (busy || deleteBusy || editSaving || movedId === targetId) return;
    const next = [...data.items];
    const from = next.findIndex((entry) => entry.id === movedId);
    if (from === -1) return;
    const [moved] = next.splice(from, 1);
    const targetIndex = next.findIndex((entry) => entry.id === targetId);
    if (!moved || targetIndex === -1) return;
    next.splice(targetIndex + (after ? 1 : 0), 0, moved);

    setSortKey("manual");
    setBusy(movedId);
    try {
      await saveEntity("items", next);
      notify("Research order saved.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not save the order.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editDraft || editSaving || busy) return;
    const candidate = { ...editDraft, updatedAt: nowIso() };
    const parsed = itemSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      setEditErrors(errors);
      notify("Some fields are not valid yet. Check the highlighted fields.", "error");
      return;
    }
    setEditSaving(true);
    setBusy(parsed.data.id);
    try {
      const next = data.items.map((entry) =>
        entry.id === parsed.data.id ? parsed.data : entry,
      );
      await saveEntity("items", next);
      setEditDraft(null);
      setEditErrors({});
      notify("Research changes saved.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not save changes.",
        "error",
      );
    } finally {
      setEditSaving(false);
      setBusy(null);
    }
  }

  function assetsFor(itemId: string): Asset[] {
    return data.assets.filter((asset) => asset.itemIds.includes(itemId));
  }

  async function saveFields(
    item: ResearchItem,
    patch: Partial<ResearchItem>,
    message = "Saved.",
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
        error instanceof Error ? error.message : "Could not save this row.",
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
        notify("Data changed elsewhere. It has been reloaded.", "error");
      } else {
        notify(
          error instanceof Error ? error.message : "Could not change the status.",
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
      notify("Document URL is required.", "error");
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
      notify("Document added to this row.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not add the document.",
        "error",
      );
    } finally {
      setBusy(null);
    }
  }

  function removeAsset(asset: Asset) {
    setPendingAssetDelete(asset);
  }

  async function confirmRemoveAsset() {
    if (!pendingAssetDelete || deleteBusy) return;
    const asset = pendingAssetDelete;
    setDeleteBusy(true);
    try {
      await saveEntity(
        "assets",
        data.assets.filter((entry) => entry.id !== asset.id),
      );
      setPendingAssetDelete(null);
      notify("Document removed. A backup was still saved.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not remove the document.",
        "error",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Research / Tracker"
        title="Research tracker"
        description="Spreadsheet of every paper. Click a cell to edit, press Enter to save. The Documents button opens each row's links and files."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => void addItem()}
              disabled={Boolean(busy)}
              aria-label="Add research"
              title="Add research"
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
              placeholder="Search title, ID, venue, notes…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search tracker"
            />
            <select
              className="pixel-input admin-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter status"
            >
              <option value="all">All statuses</option>
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
              <option value="all">All roles</option>
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
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {RESEARCH_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {RESEARCH_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <select
              className="pixel-input admin-input"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              aria-label="Urutkan"
            >
              <option value="manual">Sort: Manual (drag)</option>
              <option value="trackerId">Sort: ID</option>
              <option value="title">Sort: Title</option>
              <option value="status">Sort: Status</option>
              <option value="targetDate">Sort: Date</option>
              <option value="updatedAt">Sort: Last edited</option>
            </select>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost admin-topbar-btn"
              onClick={() => setSortDir((dir) => (dir === 1 ? -1 : 1))}
              disabled={sortKey === "manual"}
              title={
                sortKey === "manual"
                  ? "Manual order is set with drag and drop"
                  : undefined
              }
            >
              {sortDir === 1 ? "A→Z" : "Z→A"}
            </button>
          </div>

          {filtered.length === 0 ? (
            <AdminEmpty>No matching rows.</AdminEmpty>
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
                          data-busy={busy === item.id}
                          data-drag={dragId === item.id ? "true" : undefined}
                          data-drop={
                            dropHint?.id === item.id
                              ? dropHint.after
                                ? "after"
                                : "before"
                              : undefined
                          }
                          onDragOver={(event) => {
                            if (!dragId || dragId === item.id) return;
                            event.preventDefault();
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const after =
                              event.clientY > rect.top + rect.height / 2;
                            if (
                              dropHint?.id !== item.id ||
                              dropHint.after !== after
                            ) {
                              setDropHint({ id: item.id, after });
                            }
                          }}
                          onDragLeave={(event) => {
                            if (
                              event.currentTarget.contains(
                                event.relatedTarget as Node | null,
                              )
                            ) {
                              return;
                            }
                            if (dropHint?.id === item.id) setDropHint(null);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const after =
                              event.clientY > rect.top + rect.height / 2;
                            const source =
                              dragId ??
                              event.dataTransfer.getData("text/plain");
                            setDragId(null);
                            setDropHint(null);
                            if (source) {
                              void reorderItems(source, item.id, after);
                            }
                          }}
                        >
                          <td
                            className="sheet-sticky sheet-col-id"
                            title={item.trackerId || item.id}
                          >
                            <div className="sheet-id-cell">
                              <button
                                type="button"
                                className="sheet-drag"
                                draggable
                                onDragStart={(event) => {
                                  setDragId(item.id);
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    item.id,
                                  );
                                }}
                                onDragEnd={() => {
                                  setDragId(null);
                                  setDropHint(null);
                                }}
                                aria-label={`Reorder ${item.title}`}
                                title="Drag to reorder"
                              >
                                ⠿
                              </button>
                              <span className="sheet-id">{rowIndex + 1}</span>
                            </div>
                          </td>
                          <td className="sheet-sticky sheet-col-title">
                            <CellArea
                              value={item.title}
                              disabled={locked}
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
                              disabled={locked}
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
                              disabled={locked}
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
                              disabled={locked}
                              onChange={(event) =>
                                void saveFields(item, {
                                  researchKind: event.target
                                    .value as ResearchItem["researchKind"],
                                })
                              }
                              aria-label={`Type of ${item.title}`}
                            >
                              {RESEARCH_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {RESEARCH_KIND_LABELS[kind]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="sheet-input"
                              data-value={item.researchCategory}
                              value={item.researchCategory}
                              disabled={locked}
                              onChange={(event) =>
                                void saveFields(item, {
                                  researchCategory: event.target
                                    .value as ResearchItem["researchCategory"],
                                })
                              }
                              aria-label={`Kategori ${item.title}`}
                            >
                              {RESEARCH_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {RESEARCH_CATEGORY_LABELS[category]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <CellInput
                              value={item.targetVenue}
                              disabled={locked}
                              onCommit={(next) =>
                                void saveFields(item, { targetVenue: next })
                              }
                            />
                          </td>
                          <td>
                            <CellInput
                              value={item.authors.join("; ")}
                              disabled={locked}
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
                              disabled={locked}
                              onChange={(event) =>
                                void saveFields(item, {
                                  targetDate: event.target.value,
                                })
                              }
                              aria-label={`Published or due date for ${item.title}`}
                            />
                            <span className="sheet-date">
                              {item.targetDate ? formatDate(item.targetDate) : ""}
                            </span>
                          </td>
                          <td>
                            <CellArea
                              value={item.nextStep}
                              disabled={locked}
                              onCommit={(next) =>
                                void saveFields(item, { nextStep: next })
                              }
                            />
                          </td>
                          <td>
                            <CellInput
                              value={item.link}
                              disabled={locked}
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
                                open ↗
                              </a>
                            ) : null}
                          </td>
                          <td>
                            <CellArea
                              value={item.notes}
                              disabled={locked}
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
                                onClick={() => startEdit(item)}
                                disabled={locked}
                                aria-label={`Edit ${item.title}`}
                                title="Edit research"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                className="sheet-icon-btn"
                                data-open={isOpen}
                                onClick={() => setOpenId(isOpen ? null : item.id)}
                                aria-expanded={isOpen}
                                aria-label={`Documents for ${item.title}`}
                                title="Documents and links"
                              >
                                <PaperclipIcon />
                                <span>{linkCount}</span>
                              </button>
                              <button
                                type="button"
                                className="sheet-icon-btn is-danger"
                                onClick={() => void removeItem(item)}
                                disabled={locked}
                                aria-label={`Delete ${item.title}`}
                                title="Delete research"
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
                                  <h3>Documents & links — {item.title}</h3>
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
                                      <span>Public page</span>
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
                                        disabled={locked}
                                        aria-label={`Remove ${asset.label}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  {!item.publicUrl && !item.doi && assets.length === 0 ? (
                                    <p className="tracker-muted">
                                      No documents yet. Add a URL below or fill
                                      in the Link column.
                                    </p>
                                  ) : null}
                                </div>

                                <div className="tracker-story">
                                  <div>
                                    <p className="tracker-story-title">
                                      Detail penelitian
                                    </p>
                                    <p className="tracker-muted">
                                      {item.detail.trim()
                                        ? `${item.detail.trim().length} characters · shown publicly only when this research is public.`
                                        : "No story or extra detail yet. Write one with the edit button."}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="admin-mini-btn"
                                    onClick={() => startEdit(item)}
                                    disabled={locked}
                                  >
                                    EDIT DETAIL
                                  </button>
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
                                    placeholder="Document name"
                                    value={assetDraft.label}
                                    onChange={(event) =>
                                      setAssetDraft((draft) => ({
                                        ...draft,
                                        label: event.target.value,
                                      }))
                                    }
                                    aria-label="Document name"
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
                                    aria-label="Document URL"
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
                                    aria-label="Document type"
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
                                      locked || !assetDraft.url.trim()
                                    }
                                    aria-label="Add document"
                                    title="Add document"
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

      <Modal
        open={Boolean(editDraft)}
        title={editDraft ? `Edit: ${editDraft.title || "Research"}` : "Edit research"}
        size="lg"
        onClose={() => {
          if (editSaving) return;
          setEditDraft(null);
          setEditErrors({});
        }}
        footer={
          <>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost"
              onClick={() => {
                if (editSaving) return;
                setEditDraft(null);
                setEditErrors({});
              }}
              disabled={editSaving}
            >
              BATAL
            </button>
            <button
              type="button"
              className="pixel-btn"
              onClick={() => void saveEdit()}
              disabled={editSaving || Boolean(busy)}
            >
              {editSaving ? "SAVING…" : "SAVE"}
            </button>
          </>
        }
      >
        {editDraft ? (
          <SchemaForm
            fields={itemFields(data, false)}
            value={editDraft}
            onChange={(next) => setEditDraft(next)}
            errors={editErrors}
            disabled={editSaving}
            idPrefix="tracker-edit"
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete research?"
        onClose={() => {
          if (deleteBusy) return;
          setPendingDelete(null);
        }}
        footer={
          <>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleteBusy}
            >
              BATAL
            </button>
            <button
              type="button"
              className="pixel-btn admin-btn-danger"
              onClick={() => void confirmRemoveItem()}
              disabled={deleteBusy}
            >
              {deleteBusy ? "DELETING…" : "DELETE"}
            </button>
          </>
        }
      >
        <p>
          Delete <strong>{pendingDelete?.title}</strong>?
        </p>
        <p className="mt-2 text-[16px] text-muted">
          An automatic backup is still saved in Neon, so it can be restored from
          the Data page.
        </p>
      </Modal>

      <Modal
        open={Boolean(pendingAssetDelete)}
        title="Remove document?"
        onClose={() => {
          if (deleteBusy) return;
          setPendingAssetDelete(null);
        }}
        footer={
          <>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost"
              onClick={() => setPendingAssetDelete(null)}
              disabled={deleteBusy}
            >
              BATAL
            </button>
            <button
              type="button"
              className="pixel-btn admin-btn-danger"
              onClick={() => void confirmRemoveAsset()}
              disabled={deleteBusy}
            >
              {deleteBusy ? "DELETING…" : "DELETE"}
            </button>
          </>
        }
      >
        <p>
          Remove document{" "}
          <strong>{pendingAssetDelete?.label}</strong>?
        </p>
        <p className="mt-2 text-[16px] text-muted">
          The document link is detached from this research. A backup is saved automatically.
        </p>
      </Modal>
    </div>
  );
}
