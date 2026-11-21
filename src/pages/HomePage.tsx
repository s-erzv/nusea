import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import {
  ALL_STATUSES,
  ITEM_TYPES,
  ITEM_TYPE_LABELS,
  PIPELINE_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  type ItemType,
  type ResearchStatus,
} from "../../shared/constants";
import { assets, items, profile, publishedItems, venues, venueById } from "../data";
import { EmptyState } from "../components/EmptyState";
import { PixelAvatar } from "../components/PixelAvatar";
import { QuestCard } from "../components/QuestCard";
import { SectionHeading } from "../components/SectionHeading";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { cn } from "../lib/format";

type TypeFilter = ItemType | "all";
type StatusFilter = ResearchStatus | "all";
type ViewMode = "card" | "list";
type SortMode = "recent" | "oldest" | "title" | "published";

const HERO_PHRASES = [
  "never planned to be a researcher.",
  "researching in public anyway.",
  "still figuring it out, loudly.",
];

function useTypewriter(phrases: readonly string[]): string {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[index % phrases.length] ?? "";
    if (!deleting && text === current) {
      const timer = window.setTimeout(() => setDeleting(true), 1700);
      return () => window.clearTimeout(timer);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIndex((value) => (value + 1) % phrases.length);
      return;
    }
    const timer = window.setTimeout(
      () => {
        setText(current.slice(0, text.length + (deleting ? -1 : 1)));
      },
      deleting ? 20 : 45,
    );
    return () => window.clearTimeout(timer);
  }, [deleting, index, phrases, text]);

  return text;
}

export function HomePage() {
  useDocumentTitle("Research");
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useTypewriter(HERO_PHRASES);
  const [clock, setClock] = useState("");

  useEffect(() => {
    function tick() {
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour12: false,
          timeZone: "Asia/Jakarta",
        }),
      );
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (event.key !== "/" || typing) return;
      event.preventDefault();
      searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function openRandomResearch() {
    if (items.length === 0) return;
    const pick = items[Math.floor(Math.random() * items.length)];
    if (pick) navigate(`/research/${pick.id}`);
  }
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("card");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

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
        if (sortMode === "title") return a.title.localeCompare(b.title, "en");
        if (sortMode === "oldest") return a.updatedAt.localeCompare(b.updatedAt);
        if (sortMode === "published") {
          return (b.publishedAt || b.updatedAt).localeCompare(
            a.publishedAt || a.updatedAt,
          );
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [fuse, query, statusFilter, typeFilter, sortMode]);

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

  const featured =
    view === "card" ? filtered.find((item) => item.pinned) : undefined;
  const rest = featured
    ? filtered.filter((item) => item.id !== featured.id)
    : filtered;

  const statusCounts = useMemo(() => {
    const counts = new Map<ResearchStatus, number>();
    for (const item of items) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return counts;
  }, []);

  const pipelineStatuses = [...PIPELINE_STATUSES, ...TERMINAL_STATUSES].filter(
    (status) => (statusCounts.get(status) ?? 0) > 0,
  );

  const researchTags = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.keywords))]
        .filter(Boolean)
        .slice(0, 16),
    [],
  );

  const latestResearch = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3),
    [],
  );

  return (
    <>
      <section className="relative overflow-hidden border-b-[3px] border-line bg-sky">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-orange/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-yellow/20 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 font-pixel text-[220px] leading-none text-white/5 lg:block"
        >
          LAB
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex w-fit items-center gap-2 border-[3px] border-line bg-yellow px-2 py-1 font-pixel text-[10px] uppercase leading-4 text-[#14213D]">
                  <span className="h-2 w-2 animate-pulse border border-line bg-success" />
                  Field log · issue 01
                </span>
                <span className="font-pixel text-[9px] uppercase tracking-[0.12em] text-muted">
                  Jakarta · 2026 · online
                </span>
              </div>

              <h1 className="mt-6 font-pixel text-[52px] leading-[0.95] sm:text-[84px]">
                NUSEA<span className="text-orange">.</span>
              </h1>

              <p className="mt-4 max-w-xl text-[21px] leading-[1.35] sm:text-[25px]">
                A research lab by someone who{" "}
                <span className="inline-block whitespace-nowrap bg-yellow px-1 text-[#14213D]">
                  never planned
                </span>{" "}
                to be a researcher.
              </p>

              <p className="mt-4 max-w-lg text-[16px] leading-snug text-muted">
                Researching trust, identity, and the weird edges of digital
                systems — in public.
              </p>

              <p className="mt-2 max-w-lg font-pixel text-[10px] uppercase leading-4 tracking-[0.06em] text-muted">
                {profile?.studyProgram || "Information systems"}
                {profile?.campus
                  ? ` · ${profile.campus.replace("Universitas Islam Negeri", "UIN")}`
                  : ""}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" className="pixel-btn" onClick={scrollToResearch}>
                  EXPLORE RESEARCH
                </button>
                <button
                  type="button"
                  className="pixel-btn pixel-btn-ghost"
                  onClick={openRandomResearch}
                >
                  SURPRISE ME
                </button>
                <button
                  type="button"
                  className="font-pixel text-[10px] uppercase text-muted underline decoration-2 underline-offset-4 hover:text-orange"
                  onClick={() => window.dispatchEvent(new Event("nusea:command"))}
                >
                  or search ⌘K
                </button>
              </div>

              <dl className="mt-8 grid max-w-xl grid-cols-2 gap-px border-[3px] border-line bg-line sm:grid-cols-4">
                {[
                  ["PUBLIC", items.length],
                  ["PUBLISHED", publishedItems.length],
                  ["DOCS", assets.length],
                  ["VENUES", venues.length],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card px-3 py-3">
                    <dd className="font-pixel text-[22px] leading-6">{value}</dd>
                    <dt className="mt-1 font-pixel text-[8px] uppercase leading-3 text-muted">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-[460px]">
              <div
                aria-hidden="true"
                className="absolute inset-6 rotate-6 border-[3px] border-line bg-orange"
              />
              <div
                aria-hidden="true"
                className="absolute inset-10 -rotate-3 border-[3px] border-line bg-yellow"
              />

              {latestResearch[0] ? (
                <button
                  type="button"
                  className="relative block w-full -rotate-2 border-[3px] border-line bg-card p-5 text-left shadow-hard-lg transition-transform duration-300 hover:rotate-0"
                  onClick={() => navigate(`/research/${latestResearch[0]!.id}`)}
                >
                  <span className="tape" aria-hidden="true" />
                  <p className="font-pixel text-[10px] uppercase text-muted">
                    Case file // latest
                  </p>
                  <h2 className="mt-2 text-[21px] leading-snug">
                    {latestResearch[0].title}
                  </h2>
                  <p className="mt-2 font-pixel text-[10px] uppercase text-muted">
                    {STATUS_LABELS[latestResearch[0].status]} ·{" "}
                    {ITEM_TYPE_LABELS[latestResearch[0].type]}
                  </p>
                  {latestResearch[0].abstract ? (
                    <p className="mt-3 line-clamp-2 text-[14px] leading-snug text-muted">
                      {latestResearch[0].abstract}
                    </p>
                  ) : null}
                  <span className="mt-4 inline-block font-pixel text-[11px] text-orange">
                    OPEN FILE →
                  </span>
                </button>
              ) : null}

              {latestResearch[1] ? (
                <button
                  type="button"
                  className="relative mt-4 ml-auto block w-[88%] rotate-2 border-[3px] border-line bg-paper p-4 text-left shadow-hard transition-transform duration-300 hover:rotate-0"
                  onClick={() => navigate(`/research/${latestResearch[1]!.id}`)}
                >
                  <span className="tape tape-right" aria-hidden="true" />
                  <p className="font-pixel text-[9px] uppercase text-muted">
                    Next up
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-[16px] leading-snug">
                    {latestResearch[1].title}
                  </h3>
                  <p className="mt-1 font-pixel text-[9px] uppercase text-muted">
                    {STATUS_LABELS[latestResearch[1].status]}
                  </p>
                </button>
              ) : null}

              <div className="relative mx-auto mt-4 flex w-[92%] -rotate-1 items-center gap-3 border-[3px] border-line bg-[#07152f] p-3 text-left shadow-hard transition-transform duration-300 hover:rotate-0">
                <div className="w-[86px] shrink-0 border-[3px] border-line bg-card p-1">
                  <PixelAvatar value={profile?.avatar} />
                </div>
                <div className="min-w-0 font-pixel text-[10px] leading-5 text-[#d7ffe9]">
                  <p className="truncate text-[11px] text-yellow">
                    {profile?.name || "Nusea"}
                  </p>
                  <p className="truncate text-[#8fa3bd]">{profile?.handle || "Nusea"}</p>
                  <p className="mt-1 truncate text-success">
                    &gt; {typed}
                    <span className="blink" aria-hidden="true">
                      _
                    </span>
                  </p>
                  <p className="text-[#8fa3bd]">
                    {clock} WIB · {items.length} public
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-3 rotate-[-6deg] border-[3px] border-line bg-yellow px-3 py-1 font-pixel text-[9px] text-[#14213D] shadow-hard">
                EST. 2026
              </div>
              <div className="absolute -right-2 top-0 rotate-6 border-[3px] border-line bg-orange px-2 py-1 font-pixel text-[9px] text-[#14213D] shadow-hard">
                LIVE
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b-[3px] border-line bg-yellow text-[#14213D]">
        <div className="marquee-track flex w-max gap-6 py-1.5 font-pixel text-[10px] uppercase">
          {[...items, ...items].map((item, index) => (
            <span key={`${item.id}-${index}`}>✦ {item.title}</span>
          ))}
          <span>✦ Research in public</span>
          <span>✦ Never planned to be a researcher</span>
          <span>✦ Research in public</span>
          <span>✦ Never planned to be a researcher</span>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="border-[3px] border-line bg-card p-4 shadow-hard">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-pixel text-[12px] uppercase leading-4">
              Pipeline snapshot
            </p>
            <span className="flex items-center gap-2 font-pixel text-[10px] uppercase text-muted">
              <span className="h-2 w-2 animate-pulse border border-line bg-success" />
              live from database
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="pixel-chip"
              data-active={statusFilter === "all"}
              aria-pressed={statusFilter === "all"}
              onClick={() => {
                setStatusFilter("all");
                scrollToResearch();
              }}
            >
              <span>All</span>
              <span className="border-l-2 border-line pl-2">{items.length}</span>
            </button>
            {pipelineStatuses.map((status) => (
              <button
                key={status}
                type="button"
                className="pixel-chip"
                data-active={statusFilter === status}
                aria-pressed={statusFilter === status}
                onClick={() => {
                  setStatusFilter(status);
                  scrollToResearch();
                }}
              >
                <span>{STATUS_LABELS[status]}</span>
                <span className="border-l-2 border-line pl-2">
                  {statusCounts.get(status) ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {researchTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-pixel text-[11px] uppercase leading-4 text-muted">
              Research themes
            </span>
            {researchTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="pixel-chip"
                data-active={query === tag}
                aria-pressed={query === tag}
                onClick={() => {
                  setQuery(tag);
                  scrollToResearch();
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
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
                className="mb-1 flex items-center justify-between gap-2 font-pixel text-[12px] uppercase leading-4"
              >
                <span>Search research</span>
                <span className="text-[10px] normal-case tracking-normal text-muted">
                  press <kbd className="border-2 border-line bg-paper px-1">/</kbd>
                </span>
              </label>
              <input
                ref={searchRef}
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
                <label
                  htmlFor="research-sort"
                  className="mb-1 block font-pixel text-[12px] uppercase leading-4"
                >
                  Sort
                </label>
                <select
                  id="research-sort"
                  className="pixel-input min-w-[150px]"
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(event.target.value as SortMode)
                  }
                >
                  <option value="recent">Recently updated</option>
                  <option value="published">Recently published</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A–Z</option>
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
            <div className="space-y-4">
              {featured ? (
                <QuestCard
                  key={featured.id}
                  item={featured}
                  venue={venueById.get(featured.venueId)}
                  variant="featured"
                />
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((item) => (
                  <QuestCard
                    key={item.id}
                    item={item}
                    venue={venueById.get(item.venueId)}
                    variant="card"
                  />
                ))}
              </div>
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
