import { useMemo, useState } from "react";
import {
  IDEA_SCORE_KEYS,
  IDEA_SCORE_LABELS,
  IDEA_STATUS_LABELS,
  ideaTotalScore,
} from "../../shared/constants";
import { ideaSchema, type Idea } from "../../shared/schemas";
import { ideaFields } from "../forms/fields";
import { AdminEmpty, PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { ideaStatusOptions, nowIso, uid } from "../lib/helpers";

interface IdeasPageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

interface IdeaCardProps {
  idea: Idea;
  onEdit: () => void;
  onDelete: () => void;
  onSaveScores: (scores: Idea["scores"]) => Promise<void>;
  notify: Notify;
}

function IdeaCard({ idea, onEdit, onDelete, onSaveScores, notify }: IdeaCardProps) {
  const [scores, setScores] = useState(idea.scores);
  const [saving, setSaving] = useState(false);
  const total = ideaTotalScore(scores);
  const dirty = IDEA_SCORE_KEYS.some((key) => scores[key] !== idea.scores[key]);

  async function saveScores() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await onSaveScores(scores);
      notify(`Skor "${idea.title}" disimpan (${total}/40).`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan skor.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-idea-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-pixel text-[7px] uppercase leading-4 text-muted">
            Loot / {idea.cluster}
          </p>
          <h2 className="mt-1 text-[16px] leading-snug">{idea.title}</h2>
        </div>
        <span className="admin-pill" data-public={idea.status === "dikembangkan"}>
          {IDEA_STATUS_LABELS[idea.status]}
        </span>
      </div>

      <p className="admin-idea-score mt-3">
        TOTAL {total}/40
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {IDEA_SCORE_KEYS.map((key) => (
          <label key={key} className="block">
            <span className="text-[15px] text-muted">{IDEA_SCORE_LABELS[key]}</span>
            <input
              type="number"
              min={0}
              max={10}
              className="pixel-input admin-input admin-input-xs mt-1"
              value={scores[key]}
              onChange={(event) =>
                setScores({
                  ...scores,
                  [key]: Math.max(0, Math.min(10, Number(event.target.value) || 0)),
                })
              }
              aria-label={`Skor ${IDEA_SCORE_LABELS[key]} untuk ${idea.title}`}
            />
          </label>
        ))}
      </div>

      <p className="mt-3 text-[16px] leading-snug">{idea.problem || "Belum ada problem."}</p>
      <p className="mt-2 text-[15px] leading-snug text-muted">
        {idea.whyOnChain || "Belum ada alasan on-chain."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          className="admin-mini-btn"
          disabled={!dirty || saving}
          onClick={() => void saveScores()}
        >
          {saving ? "SIMPAN…" : "SIMPAN SKOR"}
        </button>
        <button type="button" className="admin-mini-btn" onClick={onEdit}>
          EDIT
        </button>
        <button type="button" className="admin-mini-btn admin-mini-danger" onClick={onDelete}>
          HAPUS
        </button>
      </div>
      {saving ? <p className="sr-only">Menyimpan skor</p> : null}
    </article>
  );
}

export function IdeasPage({ data, saveEntity, notify }: IdeasPageProps) {
  const [editing, setEditing] = useState<Idea | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      data.ideas
        .filter((idea) => statusFilter === "all" || idea.status === statusFilter)
        .sort((a, b) => ideaTotalScore(b.scores) - ideaTotalScore(a.scores)),
    [data.ideas, statusFilter],
  );

  function startNew() {
    const now = nowIso();
    setEditing({
      id: uid("ide"),
      createdAt: now,
      updatedAt: now,
      visibility: "private",
      title: "",
      problem: "",
      whyOnChain: "",
      cluster: "Pembinaan",
      scores: { novelty: 0, feasibility: 0, impact: 0, relevance: 0 },
      status: "baru",
    });
    setIsNew(true);
  }

  async function save(value: Idea) {
    const at = nowIso();
    const next = isNew
      ? [...data.ideas, { ...value, createdAt: at, updatedAt: at }]
      : data.ideas.map((idea) =>
          idea.id === value.id ? { ...value, updatedAt: at } : idea,
        );
    const backup = await saveEntity("ideas", next);
    setEditing(null);
    notify(isNew ? "Ide baru disimpan." : `Ide disimpan.${backup ? ` Backup: ${backup}` : ""}`);
  }

  async function saveScores(idea: Idea, scores: Idea["scores"]) {
    const at = nowIso();
    const next = data.ideas.map((entry) =>
      entry.id === idea.id ? { ...entry, scores, updatedAt: at } : entry,
    );
    await saveEntity("ideas", next);
  }

  async function remove(idea: Idea) {
    if (!window.confirm(`Hapus ide "${idea.title}"?`)) return;
    await saveEntity(
      "ideas",
      data.ideas.filter((entry) => entry.id !== idea.id),
    );
    notify("Ide dihapus.");
  }

  return (
    <div>
      <PageHeader
        kicker="Bank ide / Loot"
        title="Bank ide"
        description="Skor 0–10 per dimensi. Daftar otomatis diurutkan dari total skor tertinggi."
        actions={
          <button type="button" className="pixel-btn" onClick={startNew}>
            + IDE BARU
          </button>
        }
      />

      {editing ? (
        <div className="mb-5">
          <SchemaEditor
            key={editing.id}
            title={isNew ? "Ide baru" : `Edit: ${editing.title}`}
            initial={editing}
            fields={ideaFields(isNew)}
            schema={ideaSchema}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <Panel
        title={`Daftar ide (${filtered.length}/${data.ideas.length})`}
        actions={
          <select
            className="pixel-input admin-input admin-input-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status ide"
          >
            <option value="all">Semua status</option>
            {ideaStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      >
        {filtered.length === 0 ? (
          <AdminEmpty>Belum ada ide.</AdminEmpty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                notify={notify}
                onSaveScores={(scores) => saveScores(idea, scores)}
                onEdit={() => {
                  setEditing(idea);
                  setIsNew(false);
                }}
                onDelete={() => void remove(idea)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
