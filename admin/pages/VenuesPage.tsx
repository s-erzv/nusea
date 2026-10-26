import { useMemo, useState } from "react";
import { venueSchema, type Venue } from "../../shared/schemas";
import { VENUE_KIND_LABELS } from "../../shared/constants";
import { venueFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { formatDate, nowIso, uid, visibilityOptions } from "../lib/helpers";

interface VenuesPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function VenuesPage({ data, saveEntity, notify }: VenuesPageProps) {
  const [editing, setEditing] = useState<Venue | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.venues
      .filter((venue) => (needle ? venue.name.toLowerCase().includes(needle) : true))
      .filter(
        (venue) => visibilityFilter === "all" || venue.visibility === visibilityFilter,
      )
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [data.venues, query, visibilityFilter]);

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("venue"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      name: "",
      kind: "jurnal",
      indexLevel: "tidak_terindeks",
      url: "",
      typicalReviewWeeks: 0,
      notes: "",
    });
    setIsNew(true);
  }

  async function save(value: Venue) {
    const at = nowIso();
    const next = isNew
      ? [...data.venues, { ...value, createdAt: at, updatedAt: at }]
      : data.venues.map((venue) =>
          venue.id === value.id ? { ...value, updatedAt: at } : venue,
        );
    const backup = await saveEntity("venues", next);
    setEditing(null);
    notify(isNew ? "Venue baru disimpan." : `Venue disimpan.${backup ? ` Backup: ${backup}` : ""}`);
  }

  async function remove(venue: Venue) {
    if (!window.confirm(`Hapus venue "${venue.name}"?`)) return;
    await saveEntity(
      "venues",
      data.venues.filter((entry) => entry.id !== venue.id),
    );
    notify("Venue dihapus.");
  }

  return (
    <div>
      <PageHeader
        kicker="CRUD / Venue"
        title="Venue dan target publikasi"
        description="Catatan venue selalu privat; hanya field yang ada di allowlist publik yang bisa tampil."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + VENUE BARU
          </button>
        }
      />

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Venue baru" : `Edit: ${editing.name}`}
            initial={editing}
            fields={venueFields(isNew)}
            schema={venueSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel title={`Daftar venue (${filtered.length}/${data.venues.length})`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <input
            type="search"
            className="pixel-input admin-input"
            placeholder="Cari venue…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Cari venue"
          />
          <select
            className="pixel-input admin-input"
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
            aria-label="Filter visibilitas venue"
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
          <AdminEmpty>Tidak ada venue.</AdminEmpty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jenis</th>
                  <th>Indeks</th>
                  <th>Review</th>
                  <th>Visibilitas</th>
                  <th>Diperbarui</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((venue) => (
                  <tr key={venue.id}>
                    <td>
                      <p className="font-bold">{venue.name}</p>
                      <p className="text-[15px] text-muted">{venue.id}</p>
                    </td>
                    <td>{VENUE_KIND_LABELS[venue.kind]}</td>
                    <td>{venue.indexLevel === "tidak_terindeks" ? "Tidak terindeks" : venue.indexLevel}</td>
                    <td>{venue.typicalReviewWeeks > 0 ? `${venue.typicalReviewWeeks} mgg` : "—"}</td>
                    <td>
                      <span className="admin-pill" data-public={venue.visibility === "public"}>
                        {venue.visibility === "public" ? "Publik" : "Privat"}
                      </span>
                    </td>
                    <td>{formatDate(venue.updatedAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="admin-mini-btn"
                          onClick={() => {
                            setEditing(venue);
                            setIsNew(false);
                          }}
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          className="admin-mini-btn admin-mini-danger"
                          onClick={() => void remove(venue)}
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
