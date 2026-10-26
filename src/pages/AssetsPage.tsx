import { useMemo, useState } from "react";
import {
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  type AssetKind,
} from "../../shared/constants";
import { assets } from "../data";
import { EmptyState } from "../components/EmptyState";
import { SectionHeading } from "../components/SectionHeading";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type KindFilter = AssetKind | "all";

export function AssetsPage() {
  useDocumentTitle("Inventory aset");
  const [kind, setKind] = useState<KindFilter>("all");
  const [tag, setTag] = useState("all");

  const kindCounts = useMemo(() => {
    const counts = new Map<AssetKind, number>();
    for (const asset of assets) {
      counts.set(asset.kind, (counts.get(asset.kind) ?? 0) + 1);
    }
    return counts;
  }, []);

  const tags = useMemo(
    () => [...new Set(assets.flatMap((asset) => asset.tags))].sort((a, b) => a.localeCompare(b, "id")),
    [],
  );

  const filtered = useMemo(
    () =>
      assets
        .filter((asset) => kind === "all" || asset.kind === kind)
        .filter((asset) => tag === "all" || asset.tags.includes(tag))
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.label.localeCompare(b.label, "id")),
    [kind, tag],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <SectionHeading
        numbered="02"
        kicker="Inventory"
        title="Aset penelitian yang boleh dilihat publik"
        description="Hanya aset yang ditandai publik yang muncul di sini. Berkas dan tautan privat tetap tersimpan di back office."
      />

      <div className="mt-6 border-[3px] border-line bg-card p-4 shadow-hard">
        <span className="mb-2 block font-pixel text-[7px] uppercase leading-4">
          Jenis aset
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="pixel-chip"
            data-active={kind === "all"}
            aria-pressed={kind === "all"}
            onClick={() => setKind("all")}
          >
            <span aria-hidden="true">00</span> Semua
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

        {tags.length > 0 ? (
          <div className="mt-4">
            <span className="mb-2 block font-pixel text-[7px] uppercase leading-4">
              Tag
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="pixel-chip"
                data-active={tag === "all"}
                aria-pressed={tag === "all"}
                onClick={() => setTag("all")}
              >
                Semua tag
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

      <p className="mt-5 text-[18px] text-muted" role="status" aria-live="polite">
        {filtered.length} aset ditampilkan
      </p>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState
            title={assets.length === 0 ? "INVENTORY MASIH KOSONG" : "ASET TIDAK DITEMUKAN"}
            body={
              assets.length === 0
                ? "Belum ada aset publik. Aset privat tidak ditampilkan di situs publik."
                : "Coba pilih jenis atau tag lain."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((asset) => (
              <article key={asset.id} className="pixel-card flex flex-col p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="pixel-badge">{ASSET_KIND_LABELS[asset.kind]}</span>
                  {asset.isPrimary ? (
                    <span className="pixel-badge" data-tone="pinned">
                      UTAMA
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
                <div className="mt-auto pt-4">
                  {asset.url ? (
                    <>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="pixel-btn w-full"
                      >
                        BUKA ASET
                      </a>
                      <p className="mt-2 break-all text-[15px] text-muted">
                        {new URL(asset.url).hostname}
                      </p>
                    </>
                  ) : (
                    <p className="border-2 border-dashed border-line bg-paper p-3 text-[16px] text-muted">
                      Tautan publik belum tersedia.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
