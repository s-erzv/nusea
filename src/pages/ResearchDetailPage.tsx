import { Link, useParams } from "react-router-dom";
import {
  ASSET_KIND_LABELS,
  ITEM_TYPE_LABELS,
  PIPELINE_STATUSES,
  STATUS_NUMBERS,
} from "../../shared/constants";
import { isPipelineStatus, isTerminalStatus } from "../../shared/status";
import { hasPublicField } from "../../shared/public-schemas";
import { assets, items, venueById } from "../data";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { XPBar } from "../components/XPBar";
import { doiUrl, formatDate, formatDateShort, statusProgress } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function ResearchDetailPage() {
  const { slug = "" } = useParams();
  const item = items.find((entry) => entry.id === slug);
  useDocumentTitle(item?.title ?? "Research not found");

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

  const venue = venueById.get(item.venueId);
  const progress = item.progress ?? statusProgress(item.status);
  const level = isPipelineStatus(item.status) ? STATUS_NUMBERS[item.status] : null;
  const showAuthors = hasPublicField(item, "authors");
  const showVenue = hasPublicField(item, "venue");
  const showDates = hasPublicField(item, "dates");
  const showLinks = hasPublicField(item, "links");
  const showProgress = hasPublicField(item, "progress");
  const showAbstract = hasPublicField(item, "abstract");
  const showKeywords = hasPublicField(item, "keywords");
  const showDetail = hasPublicField(item, "detail");
  const showDocuments = hasPublicField(item, "documents");
  const links = showLinks
    ? [
        item.doi
          ? { label: "DOI", href: doiUrl(item.doi), value: item.doi }
          : null,
        item.publicUrl
          ? { label: "Public page", href: item.publicUrl, value: item.publicUrl }
          : null,
      ].filter(
        (value): value is { label: string; href: string; value: string } =>
          Boolean(value),
      )
    : [];

  const timeline = showDates
    ? [
        { label: "Submitted", value: item.submittedAt },
        { label: "Decision", value: item.decisionAt },
        { label: "Published", value: item.publishedAt },
      ].filter((entry) => entry.value)
    : [];
  const documents = assets.filter((asset) => asset.researchIds.includes(item.id));

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link to="/" className="pixel-btn pixel-btn-ghost pixel-btn-small">
        &lt; BACK
      </Link>

      <header className="pixel-card-lg mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-line bg-paper px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.pinned ? (
              <span className="pixel-badge" data-tone="pinned">
                PIN
              </span>
            ) : null}
            <span className="text-[18px] text-muted">
              {ITEM_TYPE_LABELS[item.type]}
            </span>
          </div>
          <span className="font-pixel text-[12px] leading-4 text-muted">
            {level ? `STAGE ${level} / ${PIPELINE_STATUSES.length}` : isTerminalStatus(item.status) ? "ARCHIVED" : "—"}
          </span>
        </div>

        <div className="p-5 sm:p-7">
          <h1 className="text-balance text-[22px] leading-[1.65] sm:text-[30px]">
            {item.title}
          </h1>
          <dl className="mt-5 grid gap-3 border-y-2 border-dashed border-line py-4 text-[16px] sm:grid-cols-2">
            {showAuthors ? (
              <div>
                <dt className="font-pixel text-[11px] uppercase leading-4 text-muted">
                  Authors
                </dt>
                <dd className="mt-1 leading-snug">
                  {item.authors.length > 0 ? item.authors.join(", ") : "Not set"}
                </dd>
              </div>
            ) : null}
            {showVenue ? (
              <div>
                <dt className="font-pixel text-[11px] uppercase leading-4 text-muted">
                  Venue
                </dt>
                <dd className="mt-1 leading-snug">
                  {venue ? venue.name : "Not set"}
                </dd>
              </div>
            ) : null}
            {showDates ? (
              <div>
                <dt className="font-pixel text-[11px] uppercase leading-4 text-muted">
                  {item.publishedAt ? "Published" : item.submittedAt ? "Submitted" : "Updated"}
                </dt>
                <dd className="mt-1 leading-snug">
                  {formatDate(item.publishedAt || item.submittedAt || item.updatedAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-pixel text-[11px] uppercase leading-4 text-muted">
                Type
              </dt>
              <dd className="mt-1 leading-snug">{ITEM_TYPE_LABELS[item.type]}</dd>
            </div>
          </dl>

          {showProgress ? (
            <div className="mt-5 border-[3px] border-line bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[17px]">
                <span className="font-pixel text-[12px] uppercase">Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2">
                <XPBar value={progress} label={`Research progress: ${item.title}`} />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {showDetail && item.detail.trim() ? (
        <section className="pixel-card mt-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-[17px]">Story & details</h2>
            <p className="mt-2 max-w-2xl text-[18px] leading-snug text-muted">
              Process details, decisions, and context that do not fit in the paper.
            </p>
            <p className="mt-2 line-clamp-2 max-w-2xl text-[17px] leading-snug text-muted">
              {item.detail.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim()}
            </p>
          </div>
          <Link to={`/research/${item.id}/detail`} className="pixel-btn">
            READ STORY →
          </Link>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {showAbstract || showKeywords ? (
          <section className="pixel-card p-5 sm:p-6" aria-labelledby="abstrak-title">
            {showAbstract ? (
              <>
                <h2 id="abstrak-title" className="text-[16px]">
                  Abstract
                </h2>
                <div className="mt-4 space-y-3 text-[19px] leading-relaxed">
                  {item.abstract ? (
                    item.abstract
                      .split(/\n{2,}/)
                      .map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  ) : (
                    <p className="text-muted">No abstract yet.</p>
                  )}
                </div>
              </>
            ) : null}

            {showKeywords ? (
              <>
                <h2 className={showAbstract ? "mt-7 text-[16px]" : "text-[16px]"}>Keywords</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.keywords.length > 0 ? (
                    item.keywords.map((keyword) => (
                      <span key={keyword} className="border-2 border-line bg-paper px-2 py-1 text-[17px]">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted">Not set.</p>
                  )}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {showDocuments && documents.length > 0 ? (
            <section className="pixel-card p-5" aria-labelledby="documents-title">
              <h2 id="documents-title" className="text-[15px]">
                Documents
              </h2>
              <ul className="mt-3 space-y-3">
                {documents.map((document) => (
                  <li key={document.id}>
                    <a
                      className="flex items-center justify-between gap-3 border-2 border-line bg-paper px-3 py-2 text-[15px] font-semibold leading-snug hover:bg-yellow hover:text-[#14213D]"
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open document: ${document.label}`}
                    >
                      <span>{document.label}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                    <p className="mt-1 text-[16px] text-muted">
                      {ASSET_KIND_LABELS[document.kind]}
                      {document.isPrimary ? " · Primary" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showVenue ? (
            <section className="pixel-card p-5" aria-labelledby="venue-title">
              <h2 id="venue-title" className="text-[15px]">
                Venue
              </h2>
              {venue ? (
                <>
                  <p className="mt-3 text-[20px] leading-snug">{venue.name}</p>
                  <p className="mt-1 text-[17px] text-muted">
                    {venue.kind === "jurnal"
                      ? "Journal"
                      : venue.kind === "konferensi"
                        ? "Conference"
                        : "Grant"}{" "}
                    ·{" "}
                    {venue.indexLevel === "tidak_terindeks"
                      ? "Not indexed"
                      : venue.indexLevel}
                  </p>
                  {venue.typicalReviewWeeks > 0 ? (
                    <p className="mt-2 text-[17px] text-muted">
                      Estimated review: {venue.typicalReviewWeeks} weeks
                    </p>
                  ) : null}
                  {venue.url ? (
                    <a
                      className="pixel-link mt-3 inline-block text-[18px]"
                      href={venue.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open venue page
                    </a>
                  ) : null}
                </>
              ) : item.venueId ? (
                <p className="mt-3 text-[20px] leading-snug">{item.venueId}</p>
              ) : (
                <p className="mt-3 text-[18px] text-muted">Venue not set.</p>
              )}
            </section>
          ) : null}

          {showLinks ? (
            <section className="pixel-card p-5" aria-labelledby="tautan-title">
              <h2 id="tautan-title" className="text-[15px]">
                Public links
              </h2>
              {links.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        className="flex items-center justify-between gap-3 border-2 border-line bg-paper px-3 py-2 text-[15px] font-semibold leading-snug hover:bg-yellow hover:text-[#14213D]"
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>{link.label}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                      <p className="mt-1 break-all text-[16px] text-muted">{link.value}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[18px] text-muted">
                  No public links for this research yet.
                </p>
              )}
            </section>
          ) : null}

          {showDates ? (
            <section className="pixel-card p-5" aria-labelledby="tanggal-title">
              <h2 id="tanggal-title" className="text-[15px]">
                Timeline
              </h2>
              {timeline.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {timeline.map((entry) => (
                    <li key={entry.label} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 inline-block h-3 w-3 shrink-0 border-2 border-line bg-yellow"
                      />
                      <div>
                        <p className="text-[17px] font-bold">{entry.label}</p>
                        <p className="text-[17px] text-muted">{formatDate(entry.value)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-[18px] text-muted">
                  Publication dates are not set.
                </p>
              )}
              <p className="mt-4 border-t-2 border-dashed border-line pt-3 text-[16px] text-muted">
                Last updated {formatDateShort(item.updatedAt)}.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
