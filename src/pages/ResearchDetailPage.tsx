import { Link, useParams } from "react-router-dom";
import {
  ITEM_TYPE_LABELS,
  STATUS_NUMBERS,
} from "../../shared/constants";
import { isPipelineStatus, isTerminalStatus } from "../../shared/status";
import { items, venueById } from "../data";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { XPBar } from "../components/XPBar";
import { doiUrl, formatDate, formatDateShort, statusProgress } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function ResearchDetailPage() {
  const { slug = "" } = useParams();
  const item = items.find((entry) => entry.id === slug);
  useDocumentTitle(item?.title ?? "Riset tidak ditemukan");

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="QUEST TIDAK DITEMUKAN"
          body="Riset ini tidak ada atau belum ditandai publik."
          action={
            <Link to="/" className="pixel-btn">
              KEMBALI KE BERANDA
            </Link>
          }
        />
      </div>
    );
  }

  const venue = venueById.get(item.venueId);
  const progress = statusProgress(item.status, item.progressPct);
  const level = isPipelineStatus(item.status) ? STATUS_NUMBERS[item.status] : null;
  const links = [
    item.doi
      ? { label: "DOI", href: doiUrl(item.doi), value: item.doi }
      : null,
    item.publicUrl
      ? { label: "Halaman publik", href: item.publicUrl, value: item.publicUrl }
      : null,
  ].filter((value): value is { label: string; href: string; value: string } =>
    Boolean(value),
  );

  const timeline = [
    { label: "Submitted", value: item.submittedAt },
    { label: "Keputusan", value: item.decisionAt },
    { label: "Terbit", value: item.publishedAt },
  ].filter((entry) => entry.value);

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link to="/" className="pixel-btn pixel-btn-ghost pixel-btn-small">
        &lt; KEMBALI
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
          <span className="font-pixel text-[8px] leading-4 text-muted">
            {level ? `LEVEL ${level} / 9` : isTerminalStatus(item.status) ? "ARSIP" : "—"}
          </span>
        </div>

        <div className="p-5 sm:p-7">
          <h1 className="text-balance text-[22px] leading-[1.65] sm:text-[30px]">
            {item.title}
          </h1>
          <p className="mt-4 text-[19px] leading-snug">
            <span className="font-pixel text-[7px] uppercase text-muted">Penulis</span>
            <br />
            {item.authors.length > 0 ? item.authors.join(", ") : "Belum diisi"}
          </p>
          {item.advisors.length > 0 ? (
            <p className="mt-2 text-[19px] leading-snug">
              <span className="font-pixel text-[7px] uppercase text-muted">
                Pembimbing
              </span>
              <br />
              {item.advisors.join(", ")}
            </p>
          ) : null}

          <div className="mt-5 border-[3px] border-line bg-paper p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[17px]">
              <span className="font-pixel text-[7px] uppercase">XP quest</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2">
              <XPBar value={progress} label={`Progres ${item.title}`} />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="pixel-card p-5 sm:p-6" aria-labelledby="abstrak-title">
          <h2 id="abstrak-title" className="text-[16px]">
            Abstrak
          </h2>
          <div className="mt-4 space-y-3 text-[19px] leading-relaxed">
            {item.abstract ? (
              item.abstract
                .split(/\n{2,}/)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p className="text-muted">Abstrak belum diisi.</p>
            )}
          </div>

          <h2 className="mt-7 text-[16px]">Kata kunci</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.keywords.length > 0 ? (
              item.keywords.map((keyword) => (
                <span key={keyword} className="border-2 border-line bg-paper px-2 py-1 text-[17px]">
                  {keyword}
                </span>
              ))
            ) : (
              <p className="text-muted">Belum diisi.</p>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="pixel-card p-5" aria-labelledby="venue-title">
            <h2 id="venue-title" className="text-[15px]">
              Venue
            </h2>
            {venue ? (
              <>
                <p className="mt-3 text-[20px] leading-snug">{venue.name}</p>
                <p className="mt-1 text-[17px] text-muted">
                  {venue.kind === "jurnal"
                    ? "Jurnal"
                    : venue.kind === "konferensi"
                      ? "Konferensi"
                      : "Hibah"}{" "}
                  ·{" "}
                  {venue.indexLevel === "tidak_terindeks"
                    ? "Tidak terindeks"
                    : venue.indexLevel}
                </p>
                {venue.typicalReviewWeeks > 0 ? (
                  <p className="mt-2 text-[17px] text-muted">
                    Estimasi review: {venue.typicalReviewWeeks} minggu
                  </p>
                ) : null}
                {venue.url ? (
                  <a
                    className="pixel-link mt-3 inline-block text-[18px]"
                    href={venue.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka laman venue
                  </a>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-[18px] text-muted">Venue belum ditentukan.</p>
            )}
          </section>

          <section className="pixel-card p-5" aria-labelledby="tautan-title">
            <h2 id="tautan-title" className="text-[15px]">
              Tautan publik
            </h2>
            {links.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      className="pixel-btn w-full"
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label.toUpperCase()}
                    </a>
                    <p className="mt-1 break-all text-[16px] text-muted">{link.value}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[18px] text-muted">
                Belum ada tautan publik untuk riset ini.
              </p>
            )}
          </section>

          <section className="pixel-card p-5" aria-labelledby="tanggal-title">
            <h2 id="tanggal-title" className="text-[15px]">
              Lini masa
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
                Tanggal publik belum diisi.
              </p>
            )}
            <p className="mt-4 border-t-2 border-dashed border-line pt-3 text-[16px] text-muted">
              Terakhir diperbarui {formatDateShort(item.updatedAt)}.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
