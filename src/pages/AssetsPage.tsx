import { useMemo, useState } from "react";
import {
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  type AssetKind,
} from "../../shared/constants";
import { assets } from "../data";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import { formatDateShort } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type KindFilter = AssetKind | "all";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AssetsPage() {
  useDocumentTitle("Documents");
  const [kind, setKind] = useState<KindFilter>("all");
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");

  const kindCounts = useMemo(() => {
    const counts = new Map<AssetKind, number>();
    for (const asset of assets) {
      counts.set(asset.kind, (counts.get(asset.kind) ?? 0) + 1);
    }
    return counts;
  }, []);

  const tags = useMemo(
    () =>
      [...new Set(assets.flatMap((asset) => asset.tags))].sort((a, b) =>
        a.localeCompare(b, "en"),
      ),
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets
      .filter((asset) => kind === "all" || asset.kind === kind)
      .filter((asset) => tag === "all" || asset.tags.includes(tag))
      .filter((asset) => {
        if (!needle) return true;
        return [asset.label, asset.url, ...asset.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.label.localeCompare(b.label, "en"),
      );
  }, [kind, query, tag]);

  const primaryCount = assets.filter((asset) => asset.isPrimary).length;
  const kindCount = new Set(assets.map((asset) => asset.kind)).size;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <SectionHeading
        as="h1"
        numbered="02"
        kicker="Documents / Outputs"
        title="Research documents"
        description="Published journal articles, papers, and public files. Private research documents stay in the back office."
      />

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Documents", assets.length],
          ["Kinds", kindCount],
          ["Tags", tags.length],
          ["Primary", primaryCount],
        ].map(([label, value], index) => (
          <div key={label} className="pixel-card p-3">
            <dt className="flex items-center gap-2 text-[15px] text-muted">
              <span aria-hidden="true" className="font-pixel text-[12px]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {label}
            </dt>
            <dd className="mt-1 font-pixel text-[20px]">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-[3px] border-line bg-card p-4 shadow-hard">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label
              htmlFor="asset-search"
              className="mb-1 block font-pixel text-[12px] uppercase leading-4"
            >
              Search documents
            </label>
            <input
              id="asset-search"
              type="search"
              className="pixel-input"
              placeholder="Title, tag, or host…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="self-end text-[15px] text-muted">
            {filtered.length} of {assets.length} shown
          </div>
        </div>

        <div className="mt-4">
          <span className="mb-2 block font-pixel text-[12px] uppercase leading-4">
            Document type
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pixel-chip"
              data-active={kind === "all"}
              aria-pressed={kind === "all"}
              onClick={() => setKind("all")}
            >
              <span aria-hidden="true">00</span> All
              <span className="border-l-2 border-line pl-2">{assets.length}</span>
            </button>
            {ASSET_KINDS.filter((entry) => (kindCounts.get(entry) ?? 0) > 0).map(
              (entry) => (
                <button
                  key={entry}
                  type="button"
                  className="pixel-chip"
                  data-active={kind === entry}
                  aria-pressed={kind === entry}
                  onClick={() => setKind(entry)}
                >
                  {ASSET_KIND_LABELS[entry]}
                  <span className="border-l-2 border-line pl-2">
                    {kindCounts.get(entry)}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="mt-4">
            <span className="mb-2 block font-pixel text-[12px] uppercase leading-4">
              Tags
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="pixel-chip"
                data-active={tag === "all"}
                aria-pressed={tag === "all"}
                onClick={() => setTag("all")}
              >
                All tags
              </button>
              {tags.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="pixel-chip"
                  data-active={tag === entry}
                  aria-pressed={tag === entry}
                  onClick={() => setTag(entry)}
                >
                  #{entry}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            title={assets.length === 0 ? "DOCUMENTS ARE EMPTY" : "NO DOCUMENTS FOUND"}
            body={
              assets.length === 0
                ? "No public documents yet. Private files stay in the back office."
                : "Try another type, tag, or keyword."
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto border-[3px] border-line bg-card shadow-hard sm:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b-[3px] border-line bg-paper">
                    {["Document", "Type", "Research", "Tags", "Access", "Updated"].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-3 py-2 font-pixel text-[12px] uppercase leading-4"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => (
                    <tr key={asset.id} className="border-b-2 border-line/30 last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[18px] font-bold">{asset.label}</span>
                          {asset.isPrimary ? (
                            <span className="pixel-badge" data-tone="pinned">
                              PRIMARY
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-all text-[15px] text-muted">
                          {asset.url ? hostOf(asset.url) : "No public link"}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="pixel-badge">{ASSET_KIND_LABELS[asset.kind]}</span>
                      </td>
                      <td className="px-3 py-3 align-top text-[15px] text-muted">
                        {asset.researchIds.length > 0
                          ? `${asset.researchIds.length} linked`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {asset.tags.length > 0 ? (
                            asset.tags.map((entry) => (
                              <span
                                key={entry}
                                className="border-2 border-line bg-paper px-1 text-[15px] leading-tight"
                              >
                                #{entry}
                              </span>
                            ))
                          ) : (
                            <span className="text-[15px] text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {asset.url ? (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="pixel-btn pixel-btn-small"
                            aria-label={`Open document: ${asset.label}`}
                          >
                            OPEN
                          </a>
                        ) : (
                          <span className="text-[15px] text-muted">Private</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-top text-[15px] text-muted">
                        {formatDateShort(asset.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 sm:hidden">
              {filtered.map((asset) => (
                <article key={asset.id} className="pixel-card flex flex-col p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="pixel-badge">{ASSET_KIND_LABELS[asset.kind]}</span>
                    {asset.isPrimary ? (
                      <span className="pixel-badge" data-tone="pinned">
                        PRIMARY
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-[14px] leading-[1.8]">{asset.label}</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {asset.tags.map((entry) => (
                      <span
                        key={entry}
                        className="border-2 border-line bg-paper px-1.5 py-0.5 text-[16px] leading-tight"
                      >
                        #{entry}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[15px] text-muted">
                    {asset.researchIds.length > 0
                      ? `Linked to ${asset.researchIds.length} research`
                      : "Not linked to research"}
                  </p>
                  <div className="mt-auto pt-4">
                    {asset.url ? (
                      <>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="pixel-btn w-full"
                          aria-label={`Open document: ${asset.label}`}
                        >
                          OPEN DOCUMENT
                        </a>
                        <p className="mt-2 break-all text-[15px] text-muted">
                          {hostOf(asset.url)}
                        </p>
                      </>
                    ) : (
                      <p className="border-2 border-dashed border-line bg-paper p-3 text-[16px] text-muted">
                        No public link yet.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
