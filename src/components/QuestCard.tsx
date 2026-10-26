import { Link } from "react-router-dom";
import {
  ITEM_TYPE_LABELS,
  PIPELINE_STATUSES,
  STATUS_NUMBERS,
} from "../../shared/constants";
import { isPipelineStatus } from "../../shared/status";
import type { PublicItem, PublicVenue } from "../../shared/public-schemas";
import { cn, excerpt, formatDateShort, statusProgress } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { XPBar } from "./XPBar";

interface QuestCardProps {
  item: PublicItem;
  venue?: PublicVenue;
  variant: "card" | "list";
}

export function QuestCard({ item, venue, variant }: QuestCardProps) {
  const level = isPipelineStatus(item.status) ? STATUS_NUMBERS[item.status] : null;
  const progress = statusProgress(item.status, item.progressPct);
  const date = item.publishedAt || item.submittedAt || item.updatedAt;
  const dateLabel = item.publishedAt ? "Published" : item.submittedAt ? "Submitted" : "Updated";

  if (variant === "list") {
    return (
      <Link
        to={`/research/${item.id}`}
        className="group block border-[3px] border-line bg-card p-4 shadow-hard transition-transform duration-100 hover:-translate-y-0.5 hover:bg-paper focus-visible:-translate-y-0.5"
        aria-label={`Open research: ${item.title}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.pinned ? (
              <span className="pixel-badge" data-tone="pinned">
                PIN
              </span>
            ) : null}
            <span className="text-[13px] text-muted">{ITEM_TYPE_LABELS[item.type]}</span>
          </div>
          <h3 className="text-[16px] font-semibold leading-[1.5] sm:flex-1">{item.title}</h3>
          <div className="flex shrink-0 items-center gap-3 text-[13px] text-muted">
            <span>{level ? `Stage ${level}` : "Archived"}</span>
            <span>{dateLabel} {formatDateShort(date)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/research/${item.id}`}
      className="quest-card group flex h-full flex-col border-[3px] border-line bg-card p-5 shadow-hard transition-transform duration-100 hover:-translate-y-1 hover:shadow-hard-lg"
      aria-label={`Open research: ${item.title}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.pinned ? (
            <span className="pixel-badge" data-tone="pinned">
              PIN
            </span>
          ) : null}
        </div>
        <span className="font-pixel text-[12px] leading-4 text-muted">
          {level ? `Stage ${level}/${PIPELINE_STATUSES.length}` : "Archived"}
        </span>
      </div>

      <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
        {ITEM_TYPE_LABELS[item.type]}
      </p>
      <h3 className="mt-2 text-[17px] font-semibold leading-[1.5]">{item.title}</h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-muted">
        {excerpt(item.abstract, 180)}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.keywords.slice(0, 4).map((keyword) => (
          <span
            key={keyword}
            className="border-2 border-line bg-paper px-1.5 py-0.5 text-[12px] leading-tight"
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px] text-muted">
          <span className="truncate">
            {venue ? venue.name : "Venue not set"}
          </span>
          <span>{progress}%</span>
        </div>
        <XPBar value={progress} label={`Research progress: ${item.title}`} animate={false} />
        <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>{dateLabel} {formatDateShort(date)}</span>
          <span className={cn("font-pixel text-[12px] text-orange")}>
            OPEN &gt;
          </span>
        </div>
      </div>
    </Link>
  );
}
