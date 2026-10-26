import { useMemo, useState } from "react";
import {
  GRANT_OUTPUT_WARNING,
  GRANT_STAGE_LABELS,
  isGrantOutputWarningActive,
} from "../../shared/constants";
import { grantSchema, type Grant } from "../../shared/schemas";
import { grantFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import {
  daysUntil,
  formatDate,
  formatIdr,
  grantStageOptions,
  nowIso,
  uid,
} from "../lib/helpers";

interface GrantsPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function GrantsPage({ data, saveEntity, notify }: GrantsPageProps) {
  const [editing, setEditing] = useState<Grant | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");

  const filtered = useMemo(
    () =>
      data.grants
        .filter((grant) => stageFilter === "all" || grant.selectionStage === stageFilter)
        .sort((a, b) => {
          const aDate = a.proposalDeadline || "9999-12-31";
          const bDate = b.proposalDeadline || "9999-12-31";
          return aDate.localeCompare(bDate);
        }),
    [data.grants, stageFilter],
  );

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("hibah"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      itemId: "",
      scheme: "",
      cluster: "Pembinaan",
      maxFundingIdr: 0,
      piName: data.profile.name,
      team: [],
      proposalDeadline: "",
      selectionStage: "persiapan",
      requiredOutputs: [],
      outputDeadline: "",
      editionNote: "",
    });
    setIsNew(true);
  }

  async function save(value: Grant) {
    const at = nowIso();
    const next = isNew
      ? [...data.grants, { ...value, createdAt: at, updatedAt: at }]
      : data.grants.map((grant) =>
          grant.id === value.id ? { ...value, updatedAt: at } : grant,
        );
    const backup = await saveEntity("grants", next);
    setEditing(null);
    notify(isNew ? "Hibah baru disimpan." : `Hibah disimpan.${backup ? ` Backup: ${backup}` : ""}`);
  }

  async function remove(grant: Grant) {
    if (!window.confirm(`Hapus hibah "${grant.scheme}"?`)) return;
    await saveEntity(
      "grants",
      data.grants.filter((entry) => entry.id !== grant.id),
    );
    notify("Hibah dihapus.");
  }

  const itemTitle = (id: string) =>
    data.items.find((item) => item.id === id)?.title ?? (id || "Tanpa riset induk");

  const totalFunding = data.grants.reduce(
    (total, grant) =>
      isGrantOutputWarningActive(grant.selectionStage) ? total + grant.maxFundingIdr : total,
    0,
  );

  return (
    <div>
      <PageHeader
        kicker="Tracker / Hibah"
        title="Tracker hibah"
        description={GRANT_OUTPUT_WARNING}
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + HIBAH BARU
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Panel title="Total dana lolos penetapan">
          <p className="text-[24px] text-orange">{formatIdr(totalFunding)}</p>
          <p className="text-[15px] text-muted">
            Dihitung dari hibah berstatus Ditetapkan, Pelaksanaan, atau Selesai.
          </p>
        </Panel>
        <Panel title="Pengingat luaran">
          <p className="text-[18px] leading-relaxed">
            Luaran jurnal wajib <strong>terbit setelah dana diterima</strong>. Jangan
            menandai naskah sebagai luaran hibah sebelum tahap penetapan.
          </p>
        </Panel>
      </div>

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Hibah baru" : `Edit: ${editing.scheme}`}
            initial={editing}
            fields={grantFields(data, isNew)}
            schema={grantSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel title={`Daftar hibah (${filtered.length}/${data.grants.length})`}>
        <div className="mb-4 max-w-sm">
          <select
            className="pixel-input admin-input"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            aria-label="Filter tahap hibah"
          >
            <option value="all">Semua tahap</option>
            {grantStageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty>Belum ada hibah yang cocok.</AdminEmpty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((grant) => {
              const days = daysUntil(grant.proposalDeadline);
              const warn = isGrantOutputWarningActive(grant.selectionStage);
              return (
                <article key={grant.id} className="admin-grant-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-pixel text-[7px] uppercase leading-4 text-muted">
                        {grant.cluster}
                      </p>
                      <h2 className="mt-1 text-[16px] leading-snug">{grant.scheme}</h2>
                    </div>
                    <span className="admin-pill" data-public={warn}>
                      {GRANT_STAGE_LABELS[grant.selectionStage]}
                    </span>
                  </div>

                  {warn ? (
                    <p className="admin-warning mt-3">{GRANT_OUTPUT_WARNING}</p>
                  ) : null}

                  <dl className="mt-3 grid gap-2 text-[16px] sm:grid-cols-2">
                    <div>
                      <dt className="text-[15px] text-muted">Dana maksimum</dt>
                      <dd>{formatIdr(grant.maxFundingIdr)}</dd>
                    </div>
                    <div>
                      <dt className="text-[15px] text-muted">PI</dt>
                      <dd>{grant.piName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[15px] text-muted">Deadline proposal</dt>
                      <dd>
                        {formatDate(grant.proposalDeadline)}
                        {days !== null ? (
                          <span className="text-muted">
                            {" "}
                            ({days < 0 ? `${Math.abs(days)} hari lewat` : `${days} hari lagi`})
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[15px] text-muted">Deadline luaran</dt>
                      <dd>{formatDate(grant.outputDeadline)}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-[15px] text-muted">Riset induk</p>
                  <p className="text-[16px] leading-tight">{itemTitle(grant.itemId)}</p>

                  {grant.requiredOutputs.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-[16px]">
                      {grant.requiredOutputs.map((output) => (
                        <li key={output}>▸ {output}</li>
                      ))}
                    </ul>
                  ) : null}

                  {grant.editionNote ? (
                    <p className="mt-2 border-t-2 border-dashed border-line pt-2 text-[15px] leading-snug text-muted">
                      {grant.editionNote}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="admin-mini-btn"
                      onClick={() => {
                        setEditing(grant);
                        setIsNew(false);
                      }}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="admin-mini-btn admin-mini-danger"
                      onClick={() => void remove(grant)}
                    >
                      HAPUS
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
