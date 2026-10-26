import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Link } from "react-router-dom";
import {
  ALL_STATUSES,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  STATUS_LABELS,
  type ItemType,
  type ResearchStatus,
} from "../../shared/constants";
import { assets, items, profile, publishedItems, venues, venueById } from "../data";
import { EmptyState } from "../components/EmptyState";
import { PixelAvatar } from "../components/PixelAvatar";
import { QuestCard } from "../components/QuestCard";
import { Scoreboard } from "../components/Scoreboard";
import { SectionHeading } from "../components/SectionHeading";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { cn } from "../lib/format";

type TypeFilter = ItemType | "all";
type StatusFilter = ResearchStatus | "all";
type ViewMode = "card" | "list";

export function HomePage() {
  useDocumentTitle("Research");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("card");

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 0.45 },
          { name: "keywords", weight: 0.25 },
          { name: "authors", weight: 0.15 },
          { name: "abstract", weight: 0.15 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [],
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<ItemType, number>();
    for (const item of items) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const searched = query.trim()
      ? fuse.search(query.trim()).map((result) => result.item)
      : items;
    return searched
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [fuse, query, statusFilter, typeFilter]);

  const hasFilters =
    query.trim() !== "" || typeFilter !== "all" || statusFilter !== "all";

  function resetFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  function scrollToResearch() {
    document.getElementById("research")?.scrollIntoView({ behavior: "smooth" });
  }

  const tagline =
    profile?.tagline || "Independent research on digital identity, information systems, and Web3.";

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
        <div className="grid items-stretch gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="pixel-card-lg relative overflow-hidden bg-paper p-4">
            <div className="mb-3 flex items-center justify-between gap-2 border-[3px] border-line bg-card px-3 py-2">
              <span className="font-pixel text-[12px] leading-4">RESEARCHER</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-2 w-2 border border-line bg-orange" />
                <span className="h-2 w-2 border border-line bg-yellow" />
                <span className="h-2 w-2 border border-line bg-[#6fcf97]" />
              </span>
            </div>
            <div className="relative mx-auto flex max-w-[300px] items-center justify-center border-[3px] border-line bg-sky p-3">
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <PixelAvatar />
            </div>
            <div className="mt-3 border-[3px] border-line bg-card px-3 py-2 text-center">
              <p className="font-pixel text-[12px] leading-4">
                {profile?.handle || "NUSEA"} · ONLINE
                <span className="blink" aria-hidden="true">
                  _
                </span>
              </p>
            </div>
          </div>

          <div className="pixel-card-lg flex flex-col justify-center bg-card p-5 sm:p-8">
            <p className="mb-3 inline-flex w-fit items-center gap-2 border-[3px] border-line bg-yellow px-2 py-1 font-pixel text-[12px] uppercase leading-4 text-[#14213D]">
              <span aria-hidden="true">▚</span> Independent research lab
            </p>
            <h1 className="text-balance text-[26px] leading-[1.5] sm:text-[38px]">
              NUSEA<span className="text-orange">.</span>
            </h1>
            <p className="mt-4 text-[21px] leading-snug">{tagline}</p>
            <p className="mt-3 max-w-xl text-[18px] leading-snug text-muted">
              {profile?.bio ||
                "A research portfolio on digital identity, information systems, and Web3."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="pixel-btn" onClick={scrollToResearch}>
                EXPLORE RESEARCH
              </button>
              <Link to="/about" className="pixel-btn pixel-btn-ghost">
                ABOUT ME
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Scoreboard
            research={items.length}
            published={publishedItems.length}
            assets={assets.length}
            venues={venues.length}
          />
        </div>
      </section>

      <section id="research" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-14">
        <SectionHeading
          numbered="01"
          kicker="Research index"
          title="Public research, in the open"
          description="Search by title, keyword, author, or abstract. Stage tracks the pipeline position; progress shows how far each research item has advanced."
        />

        <div className="mt-6 border-[3px] border-line bg-card p-4 shadow-hard sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <label
                htmlFor="research-search"
                className="mb-1 block font-pixel text-[12px] uppercase leading-4"
              >
                Search research
              </label>
              <input
                id="research-search"
                type="search"
                className="pixel-input"
                placeholder="Try: identity, SLR, TOGAF…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="research-status"
                  className="mb-1 block font-pixel text-[12px] uppercase leading-4"
                >
                  Status
                </label>
                <select
                  id="research-status"
                  className="pixel-input min-w-[170px]"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="all">All statuses</option>
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mb-1 block font-pixel text-[12px] uppercase leading-4">
                  View
                </span>
                <div className="flex border-[3px] border-line">
                  <button
                    type="button"
                    className={cn(
                      "min-h-[46px] px-3 font-pixel text-[12px]",
                      view === "card" ? "bg-yellow text-[#14213D]" : "bg-card",
                    )}
                    aria-pressed={view === "card"}
                    onClick={() => setView("card")}
                  >
                    CARDS
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-h-[46px] border-l-[3px] border-line px-3 font-pixel text-[12px]",
                      view === "list" ? "bg-yellow text-[#14213D]" : "bg-card",
                    )}
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    LIST
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <span className="mb-2 block font-pixel text-[12px] uppercase leading-4">
              Type
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="pixel-chip"
                data-active={typeFilter === "all"}
                aria-pressed={typeFilter === "all"}
                onClick={() => setTypeFilter("all")}
              >
                <span aria-hidden="true">00</span> All
                <span className="border-l-2 border-line pl-2">{items.length}</span>
              </button>
              {ITEM_TYPES.map((type, index) => (
                <button
                  key={type}
                  type="button"
                  className="pixel-chip"
                  data-active={typeFilter === type}
                  aria-pressed={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                >
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {ITEM_TYPE_LABELS[type]}
                  <span className="border-l-2 border-line pl-2">
                    {typeCounts.get(type) ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[18px] text-muted" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "research item" : "research items"} shown
            {hasFilters ? " (filtered)" : ""}
          </p>
          {hasFilters ? (
            <button type="button" className="pixel-btn pixel-btn-ghost pixel-btn-small" onClick={resetFilters}>
              RESET FILTERS
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              title={items.length === 0 ? "NO PUBLIC RESEARCH YET" : "NO RESEARCH FOUND"}
              body={
                items.length === 0
                  ? "No research is marked public yet. The lab owner can change that in the back office."
                  : "Try another keyword or clear the type and status filters."
              }
              action={
                hasFilters ? (
                  <button type="button" className="pixel-btn" onClick={resetFilters}>
                    SHOW ALL
                  </button>
                ) : undefined
              }
            />
          ) : view === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <QuestCard
                  key={item.id}
                  item={item}
                  venue={venueById.get(item.venueId)}
                  variant="card"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((item) => (
                <QuestCard
                  key={item.id}
                  item={item}
                  venue={venueById.get(item.venueId)}
                  variant="list"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
