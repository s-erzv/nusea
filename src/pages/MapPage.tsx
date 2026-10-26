import { Link } from "react-router-dom";
import {
  PIPELINE_STATUSES,
  STATUS_LABELS,
  STATUS_NUMBERS,
  TERMINAL_STATUSES,
} from "../../shared/constants";
import { items } from "../data";
import { SectionHeading } from "../components/SectionHeading";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function MapPage() {
  useDocumentTitle("Pipeline");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <SectionHeading
        as="h1"
        numbered="03"
        kicker="Pipeline map"
        title="Research progress across the pipeline"
        description="Every stop is a research stage. This map only counts research that is already public."
      />

      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE_STATUSES.map((status) => {
          const quests = items.filter((item) => item.status === status);
          const level = STATUS_NUMBERS[status];
          return (
            <li key={status} className="relative">
              <div className="pixel-card h-full p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
                      Stage {String(level).padStart(2, "0")}
                    </p>
                    <h2 className="mt-2 text-[14px] leading-[1.8]">
                      {STATUS_LABELS[status]}
                    </h2>
                  </div>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-line bg-yellow font-pixel text-[13px] text-[#14213D] shadow-hard-sm"
                  >
                    {level}
                  </span>
                </div>

                <p className="mt-3 text-[18px] text-muted">
                  {quests.length} {quests.length === 1 ? "research item" : "research items"}
                </p>

                {quests.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t-2 border-dashed border-line pt-3">
                    {quests.map((quest) => (
                      <li key={quest.id}>
                        <Link
                          to={`/research/${quest.id}`}
                          className="pixel-link block text-[17px] leading-snug"
                        >
                          {quest.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 border-t-2 border-dashed border-line pt-3 text-[16px] text-muted">
                    No public research at this stage.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-10" aria-labelledby="terminal-title">
        <h2 id="terminal-title" className="text-[18px]">
          Terminal states
        </h2>
        <p className="mt-2 max-w-2xl text-[18px] text-muted">
          Terminal states sit outside the nine-stage pipeline. Paused or finished
          public work still appears here.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {TERMINAL_STATUSES.map((status) => {
            const quests = items.filter((item) => item.status === status);
            return (
              <div key={status} className="pixel-card p-4">
                <h3 className="text-[13px] leading-[1.8]">{STATUS_LABELS[status]}</h3>
                <p className="mt-2 text-[17px] text-muted">{quests.length} {quests.length === 1 ? "research item" : "research items"}</p>
                {quests.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {quests.map((quest) => (
                      <li key={quest.id}>
                        <Link to={`/research/${quest.id}`} className="pixel-link text-[17px]">
                          {quest.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
