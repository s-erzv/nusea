import { useState } from "react";
import { PageHeader, Panel } from "../components/layout";
import { adminApi } from "../lib/api";
import type {
  Notify,
  PublishActionResult,
  PublishPreview,
} from "../lib/types";
import { todayIso } from "../lib/helpers";

interface PublishPageProps {
  notify: Notify;
  refresh: () => Promise<void>;
}

type Step = "idle" | "previewing" | "review" | "committing" | "committed" | "pushing" | "done";

export function PublishPage({ notify, refresh }: PublishPageProps) {
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [commitResult, setCommitResult] = useState<PublishActionResult | null>(null);
  const [pushResult, setPushResult] = useState<PublishActionResult | null>(null);
  const [message, setMessage] = useState(`data: publikasikan ${todayIso()}`);
  const [error, setError] = useState("");

  async function runPreview() {
    setStep("previewing");
    setError("");
    setCommitResult(null);
    setPushResult(null);
    try {
      const result = await adminApi.publishPreview();
      setPreview(result);
      setStep("review");
      if (!result.ok) {
        setError(result.error ?? "Build gagal. Periksa output.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat preview.");
      setStep("idle");
    }
  }

  async function runCommit() {
    if (!preview?.ok) return;
    if (
      !window.confirm(
        "Commit perubahan data/private dan data/public ke git? Pastikan diff publik sudah diperiksa.",
      )
    ) {
      return;
    }
    setStep("committing");
    setError("");
    try {
      const result = await adminApi.publishCommit(message);
      setCommitResult(result);
      setStep("committed");
      notify("Commit data dibuat.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Commit gagal.");
      setStep("review");
    }
  }

  async function runPush() {
    if (
      !window.confirm(
        "Push commit ke remote? Netlify akan membangun ulang situs dari commit ini.",
      )
    ) {
      return;
    }
    setStep("pushing");
    setError("");
    try {
      const result = await adminApi.publishPush();
      setPushResult(result);
      setStep("done");
      await refresh();
      notify("Push selesai. Cek dashboard Netlify.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Push gagal.");
      setStep("committed");
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Publish / Gate"
        title="Publikasikan data"
        description="Preview menjalankan publish:data, build produksi, dan check:leak. Commit dan push terpisah dan selalu butuh konfirmasi."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["1", "Export", "Hanya item publik yang disalin"],
          ["2", "Build + leak", "Gagal = tidak boleh commit"],
          ["3", "Commit", "data/private + data/public"],
          ["4", "Push", "Memicu build Netlify"],
        ].map(([number, title, detail]) => (
          <div key={number} className="border-[3px] border-line bg-card p-3">
            <p className="font-pixel text-[9px] text-orange">{number}</p>
            <p className="mt-1 font-bold">{title}</p>
            <p className="text-[15px] leading-snug text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <Panel title="1. Preview dan pemeriksaan">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="pixel-btn"
            onClick={() => void runPreview()}
            disabled={step === "previewing" || step === "committing" || step === "pushing"}
          >
            {step === "previewing" ? "MENJALANKAN…" : "JALANKAN PREVIEW"}
          </button>
          <p className="text-[15px] text-muted">
            Bisa memakan waktu 1–3 menit karena typecheck, build, dan leak check.
          </p>
        </div>

        {error ? <p className="admin-warning mt-4">{error}</p> : null}

        {preview ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Status</p>
                <p className="text-[18px]" style={{ color: preview.ok ? "var(--success)" : "var(--danger)" }}>
                  {preview.ok ? "LOLOS" : "GAGAL"}
                </p>
              </div>
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Tahap</p>
                <p className="text-[18px]">{preview.stage}</p>
              </div>
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Perubahan publik</p>
                <p className="text-[15px] break-words">{preview.stat || "Tidak ada diff"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[16px]">Git status data</h3>
              <pre className="admin-pre">{preview.status || "(bersih)"}</pre>
            </div>

            <div>
              <h3 className="text-[16px]">Diff data/public</h3>
              <pre className="admin-pre max-h-96">{preview.diff || "(tidak ada perubahan publik)"}</pre>
            </div>

            <details>
              <summary className="cursor-pointer text-[16px]">Output build lengkap</summary>
              <pre className="admin-pre mt-2 max-h-96">{preview.output || "(kosong)"}</pre>
            </details>
          </div>
        ) : null}
      </Panel>

      <div className="mt-5">
        <Panel title="2. Commit data">
          <label className="mb-1 block font-pixel text-[7px] uppercase leading-4" htmlFor="commit-message">
            Pesan commit
          </label>
          <input
            id="commit-message"
            className="pixel-input admin-input mb-3"
            value={message}
            maxLength={160}
            onChange={(event) => setMessage(event.target.value)}
            disabled={step === "committing" || step === "pushing"}
          />
          <button
            type="button"
            className="pixel-btn"
            disabled={!preview?.ok || step === "committing" || step === "pushing" || step === "committed" || step === "done"}
            onClick={() => void runCommit()}
          >
            {step === "committing" ? "COMMIT…" : "COMMIT DATA"}
          </button>
          <p className="mt-2 text-[15px] text-muted">
            Hanya path data yang di-stage. Tidak ada file kode yang ikut.
          </p>
          {commitResult ? (
            <pre className="admin-pre mt-3">{commitResult.output}</pre>
          ) : null}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="3. Push ke remote">
          <button
            type="button"
            className="pixel-btn"
            disabled={!commitResult?.ok || step === "pushing" || step === "done"}
            onClick={() => void runPush()}
          >
            {step === "pushing" ? "PUSH…" : "PUSH COMMIT"}
          </button>
          <p className="mt-2 text-[15px] text-muted">
            Push memicu deploy Netlify. Jangan push jika diff publik belum diperiksa.
          </p>
          {pushResult ? <pre className="admin-pre mt-3">{pushResult.output}</pre> : null}
        </Panel>
      </div>
    </div>
  );
}
