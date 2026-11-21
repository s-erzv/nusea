import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { ITEM_TYPE_LABELS } from "../../shared/constants";
import { assets, items, publishedItems, venues } from "../data";
import { StatusBadge } from "./StatusBadge";

const PAGES = [
  { id: "page-research", label: "Research index", hint: "Browse all public research", to: "/" },
  { id: "page-documents", label: "Documents", hint: "Public papers and files", to: "/documents" },
  { id: "page-pipeline", label: "Pipeline", hint: "Research progress map", to: "/pipeline" },
];

interface Entry {
  id: string;
  label: string;
  hint: string;
  to: string;
  kind: "research" | "page";
  status?: (typeof items)[number]["status"];
  type?: (typeof items)[number]["type"];
}

export function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "keywords", weight: 0.25 },
          { name: "authors", weight: 0.15 },
          { name: "abstract", weight: 0.1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
      }),
    [],
  );

  const results = useMemo<Entry[]>(() => {
    const needle = query.trim();
    const pageEntries: Entry[] = PAGES.filter((page) =>
      `${page.label} ${page.hint}`.toLowerCase().includes(needle.toLowerCase()),
    ).map((page) => ({ ...page, kind: "page" }));

    const researchEntries: Entry[] = (
      needle ? fuse.search(needle).map((result) => result.item) : items
    )
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        label: item.title,
        hint:
          item.authors.length > 0
            ? item.authors.slice(0, 2).join(", ")
            : ITEM_TYPE_LABELS[item.type],
        to: `/research/${item.id}`,
        kind: "research" as const,
        status: item.status,
        type: item.type,
      }));

    return [...researchEntries, ...pageEntries];
  }, [fuse, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "/" && !typing && !open) {
        event.preventDefault();
        setOpen(true);
      }
    }

    function onOpenEvent() {
      setOpen(true);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("nusea:command", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("nusea:command", onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const selected = document.getElementById(`command-item-${active}`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
  }

  function choose(entry: Entry | undefined) {
    if (!entry) return;
    close();
    navigate(entry.to);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#07152f]/70 p-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden border-[3px] border-line bg-card shadow-hard-lg"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b-[3px] border-line bg-paper px-4 py-3">
          <span className="font-pixel text-[12px] text-orange">&gt;_</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search research, pages, keywords…"
            className="min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-muted"
            aria-label="Search command palette"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="border-2 border-line bg-card px-2 py-0.5 font-pixel text-[10px] text-muted">
            ESC
          </kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[16px] text-muted">
              No matches. Try a title, author, keyword, or page.
            </li>
          ) : (
            results.map((entry, index) => (
              <li key={`${entry.kind}-${entry.id}`}>
                <button
                  id={`command-item-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className="flex w-full items-center gap-3 border-2 border-transparent px-3 py-2 text-left transition-colors hover:border-line hover:bg-paper"
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(entry)}
                  style={
                    index === active
                      ? { borderColor: "var(--line)", background: "var(--paper)" }
                      : undefined
                  }
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-line bg-yellow font-pixel text-[11px] text-[#14213D]">
                    {entry.kind === "research" ? "R" : "P"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {entry.label}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      {entry.hint}
                    </span>
                  </span>
                  {entry.kind === "research" && entry.status ? (
                    <span className="hidden shrink-0 sm:block">
                      <StatusBadge status={entry.status} />
                    </span>
                  ) : null}
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ↵
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line bg-paper px-4 py-2 text-[12px] text-muted">
          <span className="font-pixel text-[10px]">
            ↑↓ navigate · ↵ open · esc close
          </span>
          <span className="ml-auto font-pixel text-[10px]">
            {items.length} research · {publishedItems.length} published ·{" "}
            {venues.length} venues · {assets.length} docs
          </span>
        </div>
      </div>
    </div>
  );
}
