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
  const [message, setMessage] = useState(`data: publish ${todayIso()}`);
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
        setError(result.error ?? "Build failed. Check the output.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create preview.",
      );
      setStep("idle");
    }
  }

  async function runCommit() {
    if (!preview?.ok) return;
    if (
      !window.confirm(
        "Commit changes in data/private and data/public to git? Make sure you have reviewed the public diff.",
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
      notify("Data commit created.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Commit failed.");
      setStep("review");
    }
  }

  async function runPush() {
    if (
      !window.confirm(
        "Push the commit to the remote? Netlify will rebuild the site from this commit.",
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
      notify("Push complete. Check the Netlify dashboard.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Push failed.");
      setStep("committed");
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Publish / Gate"
        title="Publish data"
        description="Preview runs publish:data, a production build, and check:leak. Commit and push are separate and always require confirmation."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["1", "Export", "Only public items are copied"],
          ["2", "Build + leak", "Failure blocks the commit"],
          ["3", "Commit", "data/private + data/public"],
          ["4", "Push", "Triggers the Netlify build"],
        ].map(([number, title, detail]) => (
          <div key={number} className="border-[3px] border-line bg-card p-3">
            <p className="font-pixel text-[13px] text-orange">{number}</p>
            <p className="mt-1 font-bold">{title}</p>
            <p className="text-[15px] leading-snug text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <Panel title="1. Preview and checks">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="pixel-btn"
            onClick={() => void runPreview()}
            disabled={step === "previewing" || step === "committing" || step === "pushing"}
          >
            {step === "previewing" ? "RUNNING…" : "RUN PREVIEW"}
          </button>
          <p className="text-[15px] text-muted">
            This can take 1–3 minutes because it runs typecheck, build, and leak check.
          </p>
        </div>

        {error ? <p className="admin-warning mt-4">{error}</p> : null}

        {preview ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Status</p>
                <p className="text-[18px]" style={{ color: preview.ok ? "var(--success)" : "var(--danger)" }}>
                  {preview.ok ? "PASSED" : "FAILED"}
                </p>
              </div>
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Stage</p>
                <p className="text-[18px]">{preview.stage}</p>
              </div>
              <div className="border-[3px] border-line bg-paper p-2">
                <p className="text-[15px] text-muted">Public changes</p>
                <p className="text-[15px] break-words">{preview.stat || "No diff"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[16px]">Git status for public data</h3>
              <pre className="admin-pre">{preview.status || "(clean)"}</pre>
            </div>

            <div>
              <h3 className="text-[16px]">data/public diff</h3>
              <pre className="admin-pre max-h-96">
                {preview.diff || "(no public changes)"}
              </pre>
            </div>

            <details>
              <summary className="cursor-pointer text-[16px]">Full build output</summary>
              <pre className="admin-pre mt-2 max-h-96">
                {preview.output || "(empty)"}
              </pre>
            </details>
          </div>
        ) : null}
      </Panel>

      <div className="mt-5">
        <Panel title="2. Commit data">
          <label className="mb-1 block font-pixel text-[12px] uppercase leading-4" htmlFor="commit-message">
            Commit message
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
            Only public data is staged and committed. Private data stays on this machine.
          </p>
          {commitResult ? (
            <pre className="admin-pre mt-3">{commitResult.output}</pre>
          ) : null}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="3. Push to remote">
          <button
            type="button"
            className="pixel-btn"
            disabled={!commitResult?.ok || step === "pushing" || step === "done"}
            onClick={() => void runPush()}
          >
            {step === "pushing" ? "PUSH…" : "PUSH COMMIT"}
          </button>
          <p className="mt-2 text-[15px] text-muted">
            Push triggers a Netlify deploy. Do not push until you have reviewed the public diff.
          </p>
          {pushResult ? <pre className="admin-pre mt-3">{pushResult.output}</pre> : null}
        </Panel>
      </div>
    </div>
  );
}
