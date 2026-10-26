import { useMemo, useState } from "react";
import { assetSchema, type Asset } from "../../shared/schemas";
import { ASSET_KIND_LABELS } from "../../shared/constants";
import { assetFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import { adminApi } from "../lib/api";
import type { AdminData, CheckLinkResult, Notify, SaveEntity } from "../lib/types";
import {
  assetKindOptions,
  nowIso,
  uid,
  visibilityOptions,
} from "../lib/helpers";

interface AssetsPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function AssetsPage({ data, saveEntity, notify }: AssetsPageProps) {
  const [editing, setEditing] = useState<Asset | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [linkChecks, setLinkChecks] = useState<Record<string, CheckLinkResult | "loading">>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.assets
      .filter((asset) =>
        needle
          ? `${asset.label} ${asset.id} ${asset.url} ${asset.tags.join(" ")}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .filter((asset) => kindFilter === "all" || asset.kind === kindFilter)
      .filter(
        (asset) => visibilityFilter === "all" || asset.visibility === visibilityFilter,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.assets, kindFilter, query, visibilityFilter]);

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("aset"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      kind: "drive",
      label: "",
      url: "",
      localPath: "",
      itemIds: [],
      tags: [],
      isPrimary: false,
      note: "",
    });
    setIsNew(true);
  }

  async function save(value: Asset) {
    const at = nowIso();
    const next = isNew
      ? [...data.assets, { ...value, createdAt: at, updatedAt: at }]
      : data.assets.map((asset) =>
          asset.id === value.id ? { ...value, updatedAt: at } : asset,
        );
    const backup = await saveEntity("assets", next);
    setEditing(null);
    notify(
      isNew
        ? "New asset saved."
        : `Asset saved.${backup ? ` Backup: ${backup}` : ""}`,
    );
  }

  async function remove(asset: Asset) {
    if (!window.confirm(`Delete asset "${asset.label}"?`)) return;
    await saveEntity(
      "assets",
      data.assets.filter((entry) => entry.id !== asset.id),
    );
    notify("Asset deleted.");
  }

  async function checkLink(asset: Asset) {
    if (!asset.url) {
      notify("This asset has no URL to check.", "error");
      return;
    }
    setLinkChecks((current) => ({ ...current, [asset.id]: "loading" }));
    try {
      const result = await adminApi.checkLink(asset.url);
      setLinkChecks((current) => ({ ...current, [asset.id]: result }));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not check link.", "error");
      setLinkChecks((current) => {
        const next = { ...current };
        delete next[asset.id];
        return next;
      });
    }
  }

  const itemTitle = (id: string) => data.items.find((item) => item.id === id)?.title ?? id;

  return (
    <div>
      <PageHeader
        kicker="CRUD / Inventory"
        title="Asset inventory"
        description="Store Sheets, Drive, Overleaf, Figma, and local asset links. Link checks only run when you press the button."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + NEW ASSET
          </button>
        }
      />

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "New asset" : `Edit: ${editing.label}`}
            initial={editing}
            fields={assetFields(data, isNew)}
            schema={assetSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel title={`Asset list (${filtered.length}/${data.assets.length})`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            type="search"
            className="pixel-input admin-input"
            placeholder="Search label, URL, tag…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search assets"
          />
          <select
            className="pixel-input admin-input"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)}
            aria-label="Filter by asset type"
          >
            <option value="all">All types</option>
            {assetKindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="pixel-input admin-input"
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
            aria-label="Filter by asset visibility"
          >
            <option value="all">All visibility</option>
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty>No matching assets.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Linked research</th>
                  <th>Visibility</th>
                  <th>Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => {
                  const check = linkChecks[asset.id];
                  return (
                    <tr key={asset.id}>
                      <td>
                        <p className="font-bold leading-tight">{asset.label}</p>
                        <p className="text-[15px] text-muted">{asset.id}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {asset.tags.map((tag) => (
                            <span key={tag} className="admin-tag">#{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td>{ASSET_KIND_LABELS[asset.kind]}</td>
                      <td>
                        {asset.itemIds.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {asset.itemIds.map((id) => (
                              <li key={id} className="text-[15px] leading-tight">
                                {itemTitle(id)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <span className="admin-pill" data-public={asset.visibility === "public"}>
                          {asset.visibility === "public" ? "Public" : "Private"}
                        </span>
                      </td>
                      <td>
                        {asset.url ? (
                          <>
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="pixel-link break-all text-[15px]"
                            >
                              Open
                            </a>
                            <div className="mt-2">
                              <button
                                type="button"
                                className="admin-mini-btn"
                                onClick={() => void checkLink(asset)}
                                disabled={check === "loading"}
                              >
                                {check === "loading" ? "CHECKING…" : "CHECK LINK"}
                              </button>
                              {check && check !== "loading" ? (
                                <p
                                  className="mt-1 text-[15px]"
                                  title={check.finalUrl}
                                  style={{ color: check.ok ? "var(--success)" : "var(--danger)" }}
                                >
                                  {check.status || "ERR"} — {check.message}
                                </p>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <span className="istirahat text-[15px] text-muted">
                            Local / no URL
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="admin-mini-btn"
                            onClick={() => {
                              setEditing(asset);
                              setIsNew(false);
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            type="button"
                            className="admin-mini-btn admin-mini-danger"
                            onClick={() => void remove(asset)}
                          >
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
