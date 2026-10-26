import { useMemo, useState } from "react";
import { sourceSchema, type SourceLog } from "../../shared/schemas";
import { VERIFICATION_STATUS_LABELS } from "../../shared/constants";
import { sourceFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { formatDate, nowIso, uid, verificationOptions } from "../lib/helpers";

interface SourcesPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function SourcesPage({ data, saveEntity, notify }: SourcesPageProps) {
  const [editing, setEditing] = useState<SourceLog | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.sources
      .filter((source) =>
        needle
          ? `${source.citationText} ${source.urlOrDoi} ${source.notes}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .filter(
        (source) =>
          verifiedFilter === "all" || source.verificationStatus === verifiedFilter,
      )
      .filter((source) => itemFilter === "all" || source.itemId === itemFilter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.sources, itemFilter, query, verifiedFilter]);

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("sumber"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      itemId: data.items[0]?.id ?? "",
      citationText: "",
      urlOrDoi: "",
      verificationStatus: "belum",
      verifiedAt: "",
      howVerified: "",
      fileOnHand: false,
      notes: "",
    });
    setIsNew(true);
  }

  async function save(value: SourceLog) {
    const at = nowIso();
    const next = isNew
      ? [...data.sources, { ...value, createdAt: at, updatedAt: at }]
      : data.sources.map((source) =>
          source.id === value.id ? { ...value, updatedAt: at } : source,
        );
    const backup = await saveEntity("sources", next);
    setEditing(null);
    notify(
      isNew
        ? "Sumber baru disimpan. Tidak pernah diekspor ke publik."
        : `Sumber disimpan.${backup ? ` Backup: ${backup}` : ""}`,
    );
  }

  async function remove(source: SourceLog) {
    if (!window.confirm("Hapus catatan sumber ini?")) return;
    await saveEntity(
      "sources",
      data.sources.filter((entry) => entry.id !== source.id),
    );
    notify("Sumber dihapus.");
  }

  const itemTitle = (id: string) =>
    data.items.find((item) => item.id === id)?.title ?? id;

  return (
    <div>
      <PageHeader
        kicker="Log / Sumber"
        title="Log sumber"
        description="Semua field di sini privat. Jangan pernah menyalin catatan verifikasi ke data publik."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + SUMBER BARU
          </button>
        }
      />

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Sumber baru" : "Edit sumber"}
            initial={editing}
            fields={sourceFields(data, isNew)}
            schema={sourceSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel title={`Daftar sumber (${filtered.length}/${data.sources.length})`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            type="search"
            className="pixel-input admin-input"
            placeholder="Cari sitasi, DOI, catatan…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Cari sumber"
          />
          <select
            className="pixel-input admin-input"
            value={verifiedFilter}
            onChange={(event) => setVerifiedFilter(event.target.value)}
            aria-label="Filter status verifikasi"
          >
            <option value="all">Semua verifikasi</option>
            {verificationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="pixel-input admin-input"
            value={itemFilter}
            onChange={(event) => setItemFilter(event.target.value)}
            aria-label="Filter riset sumber"
          >
            <option value="all">Semua riset</option>
            {data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty>Belum ada sumber yang cocok.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sitasi</th>
                  <th>Riset</th>
                  <th>Verifikasi</th>
                  <th>Dokumen</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((source) => (
                  <tr key={source.id}>
                    <td className="max-w-md">
                      <p className="leading-snug">{source.citationText}</p>
                      {source.urlOrDoi ? (
                        <p className="mt-1 break-all text-[15px] text-muted">
                          {source.urlOrDoi.startsWith("http") ? (
                            <a
                              href={source.urlOrDoi}
                              target="_blank"
                              rel="noreferrer"
                              className="pixel-link"
                            >
                              {source.urlOrDoi}
                            </a>
                          ) : (
                            source.urlOrDoi
                          )}
                        </p>
                      ) : null}
                      {source.verifiedAt ? (
                        <p className="text-[15px] text-muted">
                          Dicek {formatDate(source.verifiedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-[15px] leading-tight">{itemTitle(source.itemId)}</td>
                    <td>
                      <span
                        className="admin-pill"
                        data-public={source.verificationStatus === "terverifikasi"}
                      >
                        {VERIFICATION_STATUS_LABELS[source.verificationStatus]}
                      </span>
                    </td>
                    <td>
                      {source.fileOnHand ? (
                        <span className="font-bold" style={{ color: "var(--success)" }}>
                          Ada
                        </span>
                      ) : (
                        <span className="text-muted">Belum</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={() => {
                            setEditing(source);
                            setIsNew(false);
                          }}
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          className="admin-mini-btn admin-mini-danger"
                          onClick={() => void remove(source)}
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
