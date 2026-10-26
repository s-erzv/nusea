import { getByPath, setByPath } from "../lib/helpers";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "checkbox"
  | "checks"
  | "list"
  | "date"
  | "url";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  help?: string;
  rows?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  wide?: boolean;
}

interface SchemaFormProps<T> {
  fields: FieldDef[];
  value: T;
  onChange: (next: T) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  idPrefix: string;
}

export function SchemaForm<T extends object>({
  fields,
  value,
  onChange,
  errors = {},
  disabled = false,
  idPrefix,
}: SchemaFormProps<T>) {
  function setField(key: string, nextValue: unknown) {
    onChange(setByPath(value, key, nextValue));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const fieldValue = getByPath(value, field.key);
        const id = `${idPrefix}-${field.key.replaceAll(".", "-")}`;
        const error = errors[field.key];
        const describedBy = [
          field.help ? `${id}-help` : "",
          error ? `${id}-error` : "",
        ]
          .filter(Boolean)
          .join(" ");
        const wide = field.wide || field.type === "textarea" || field.type === "list";

        return (
          <div key={field.key} className={wide ? "sm:col-span-2" : ""}>
            {field.type === "checkbox" ? (
              <label
                htmlFor={id}
                className="flex min-h-11 cursor-pointer items-center gap-3 border-[3px] border-line bg-card px-3 py-2"
              >
                <input
                  id={id}
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--orange)]"
                  checked={Boolean(fieldValue)}
                  disabled={disabled || field.readOnly}
                  onChange={(event) => setField(field.key, event.target.checked)}
                  aria-describedby={describedBy || undefined}
                />
                <span className="text-[17px] leading-tight">{field.label}</span>
              </label>
            ) : (
              <>
                <label
                  htmlFor={id}
                  className="admin-label mb-1 block font-pixel text-[7px] uppercase leading-4"
                >
                  {field.label}
                </label>

                {field.type === "checks" ? (
                  <div
                    className="grid max-h-56 gap-1 overflow-auto border-[3px] border-line bg-card p-2 sm:grid-cols-2"
                    role="group"
                    aria-describedby={describedBy || undefined}
                  >
                    {field.options?.map((option) => {
                      const selected = Array.isArray(fieldValue)
                        ? (fieldValue as string[]).includes(option.value)
                        : false;
                      return (
                        <label
                          key={option.value}
                          className="flex min-h-10 cursor-pointer items-center gap-2 px-1 text-[16px] leading-tight"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--orange)]"
                            checked={selected}
                            disabled={disabled || field.readOnly}
                            onChange={(event) => {
                              const current = Array.isArray(fieldValue)
                                ? [...(fieldValue as string[])]
                                : [];
                              const next = event.target.checked
                                ? [...current, option.value]
                                : current.filter((entry) => entry !== option.value);
                              setField(field.key, next);
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                    {!field.options?.length ? (
                      <p className="text-[16px] text-muted">Belum ada pilihan.</p>
                    ) : null}
                  </div>
                ) : field.type === "textarea" || field.type === "list" ? (
                  <textarea
                    id={id}
                    className="pixel-input admin-input"
                    rows={field.rows ?? (field.type === "list" ? 4 : 5)}
                    value={
                      field.type === "list" && Array.isArray(fieldValue)
                        ? fieldValue.join("\n")
                        : String(fieldValue ?? "")
                    }
                    placeholder={field.placeholder}
                    disabled={disabled || field.readOnly}
                    onChange={(event) =>
                      setField(
                        field.key,
                        field.type === "list"
                          ? event.target.value
                              .split("\n")
                              .map((entry) => entry.trim())
                              .filter(Boolean)
                          : event.target.value,
                      )
                    }
                    aria-describedby={describedBy || undefined}
                    aria-invalid={Boolean(error)}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={id}
                    className="pixel-input admin-input"
                    value={String(fieldValue ?? "")}
                    disabled={disabled || field.readOnly}
                    onChange={(event) => setField(field.key, event.target.value)}
                    aria-describedby={describedBy || undefined}
                    aria-invalid={Boolean(error)}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "number" ? (
                  <input
                    id={id}
                    type="number"
                    className="pixel-input admin-input"
                    value={Number.isFinite(fieldValue) ? String(fieldValue) : "0"}
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    disabled={disabled || field.readOnly}
                    onChange={(event) =>
                      setField(
                        field.key,
                        event.target.value === "" ? 0 : Number(event.target.value),
                      )
                    }
                    aria-describedby={describedBy || undefined}
                    aria-invalid={Boolean(error)}
                  />
                ) : (
                  <input
                    id={id}
                    type={field.type === "date" ? "date" : field.type === "url" ? "url" : "text"}
                    className="pixel-input admin-input"
                    value={String(fieldValue ?? "")}
                    placeholder={field.placeholder}
                    disabled={disabled || field.readOnly}
                    onChange={(event) => setField(field.key, event.target.value)}
                    aria-describedby={describedBy || undefined}
                    aria-invalid={Boolean(error)}
                  />
                )}
              </>
            )}
            {field.help ? (
              <p id={`${id}-help`} className="mt-1 text-[15px] leading-snug text-muted">
                {field.help}
              </p>
            ) : null}
            {error ? (
              <p id={`${id}-error`} className="mt-1 text-[16px] font-bold text-danger">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
