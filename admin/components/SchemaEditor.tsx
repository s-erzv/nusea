import { useState, type ReactNode } from "react";
import type { z } from "zod";
import { SchemaForm, type FieldDef } from "./SchemaForm";

interface SchemaEditorProps<T extends object> {
  title: string;
  initial: T;
  fields: FieldDef[];
  schema: z.ZodType<T>;
  onSave: (value: T) => Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}

export function SchemaEditor<T extends object>({
  title,
  initial,
  fields,
  schema,
  onSave,
  onCancel,
  children,
}: SchemaEditorProps<T>) {
  const [draft, setDraft] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setMessage("");
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setMessage(`Ada ${parsed.error.issues.length} isian yang perlu diperbaiki.`);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave(parsed.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2 className="text-[14px] leading-6">{title}</h2>
        <button type="button" className="admin-mini-btn" onClick={onCancel}>
          TUTUP
        </button>
      </div>
      <div className="p-4">
        {children}
        <SchemaForm
          fields={fields}
          value={draft}
          onChange={setDraft}
          errors={errors}
          disabled={saving}
          idPrefix={title.replaceAll(" ", "-").toLowerCase()}
        />
        {message ? (
          <p
            role="alert"
            className="mt-4 border-[3px] border-line bg-[var(--danger)] px-3 py-2 text-[17px] text-white"
          >
            {message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="pixel-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "MENYIMPAN…" : "SIMPAN"}
          </button>
          <button
            type="button"
            className="pixel-btn pixel-btn-ghost"
            onClick={onCancel}
            disabled={saving}
          >
            BATAL
          </button>
        </div>
      </div>
    </section>
  );
}
