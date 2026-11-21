import { Link, useParams } from "react-router-dom";
import { ITEM_TYPE_LABELS } from "../../shared/constants";
import { hasPublicField } from "../../shared/public-schemas";
import { items } from "../data";
import { EmptyState } from "../components/EmptyState";
import { RichText } from "../components/RichText";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function ResearchStoryPage() {
  const { slug = "" } = useParams();
  const item = items.find((entry) => entry.id === slug);
  useDocumentTitle(item ? `Research story · ${item.title}` : "Research story");

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="RESEARCH NOT FOUND"
          body="This research does not exist or is not public yet."
          action={
            <Link to="/" className="pixel-btn">
              BACK TO RESEARCH
            </Link>
          }
        />
      </div>
    );
  }

  const showDetail = hasPublicField(item, "detail");
  const showAuthors = hasPublicField(item, "authors");
  const showDates = hasPublicField(item, "dates");

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/research/${item.id}`}
          className="pixel-btn pixel-btn-ghost pixel-btn-small"
        >
          &lt; BACK TO RESEARCH
        </Link>
        <Link to="/" className="pixel-btn pixel-btn-ghost pixel-btn-small">
          ALL RESEARCH
        </Link>
      </div>

      <header className="pixel-card-lg mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-line bg-paper px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="pixel-badge" data-tone="muted">
              {ITEM_TYPE_LABELS[item.type]}
            </span>
          </div>
          <span className="font-pixel text-[12px] leading-4 text-muted">
            RESEARCH STORY
          </span>
        </div>
        <div className="p-5 sm:p-7">
          <h1 className="text-balance text-[22px] leading-[1.65] sm:text-[30px]">
            {item.title}
          </h1>
          {showAuthors || showDates ? (
            <p className="mt-3 text-[17px] text-muted">
              {showAuthors
                ? item.authors.length > 0
                  ? item.authors.join(", ")
                  : "Author not set"
                : ""}
              {showDates && item.publishedAt
                ? ` · ${formatDate(item.publishedAt)}`
                : showDates && item.updatedAt
                  ? ` · updated ${formatDate(item.updatedAt)}`
                  : ""}
            </p>
          ) : null}
          <p className="mt-4 max-w-3xl border-t-2 border-dashed border-line pt-4 text-[18px] leading-relaxed text-muted">
            Process details, decisions, failures, datasets, and context that do
            not fit in the paper.
          </p>
        </div>
      </header>

      {showDetail && item.detail.trim() ? (
        <section className="pixel-card mt-5 p-5 sm:p-7" aria-label="Research story">
          <RichText text={item.detail} />
        </section>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="STORY NOT AVAILABLE"
            body="The long-form story for this research has not been published yet."
            action={
              <Link to={`/research/${item.id}`} className="pixel-btn">
                OPEN RESEARCH
              </Link>
            }
          />
        </div>
      )}

      <p className="mt-6 border-t-2 border-dashed border-line pt-4 text-[16px] text-muted">
        Part of Nusea · supplementary story for{" "}
        <Link to={`/research/${item.id}`} className="pixel-link font-semibold">
          {item.title}
        </Link>
        .
      </p>
    </article>
  );
}
