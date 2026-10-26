import {
  ASSET_KIND_LABELS,
  STATUS_LABELS,
} from "../../shared/constants";
import { statusProgress } from "../../shared/status";
import { PageHeader, Panel } from "../components/layout";
import type { AdminData, AdminTab } from "../lib/types";
import { formatDate } from "../lib/helpers";

interface DashboardPageProps {
  data: AdminData;
  onNavigate: (tab: AdminTab) => void;
}

export function DashboardPage({ data, onNavigate }: DashboardPageProps) {
  const publicItems = data.items
    .filter((item) => item.visibility === "public")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const publicAssets = data.assets.filter((asset) => asset.visibility === "public");
  const scheduled = data.items.filter((item) => item.status === "scheduled");
  const itemById = new Map(data.items.map((item) => [item.id, item]));

  const documentsFor = (itemId: string) =>
    data.assets.filter((asset) => asset.itemIds.includes(itemId));

  const warnings = [
    ...data.items
      .filter((item) => item.status === "published" && item.visibility !== "public")
      .map((item) => ({
        id: `published-${item.id}`,
        text: `"${item.title}" is published but still private.`,
      })),
    ...publicItems
      .filter((item) => !["accepted", "scheduled", "published"].includes(item.status))
      .map((item) => ({
        id: `unready-${item.id}`,
        text: `"${item.title}" is public but status is ${STATUS_LABELS[item.status]}. Check readiness.`,
      })),
    ...(data.profile.visibility === "public"
      ? []
      : [{ id: "profile-private", text: "Profile is still private; the public site uses a fallback." }]),
  ];

  return (
    <div>
      <PageHeader
        kicker="Overview / Workspace"
        title="Dashboard"
        description="Public research and the documents linked to it. Admin data stays on this machine."
        actions={
          <a
            className="pixel-btn pixel-btn-ghost"
            href="http://127.0.0.1:5173"
            target="_blank"
            rel="noreferrer"
          >
            OPEN PUBLIC SITE
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Public research">
          <p className="text-[28px] text-orange">{publicItems.length}</p>
          <p className="text-[15px] text-muted">{data.items.length} total research items</p>
        </Panel>
        <Panel title="Scheduled">
          <p className="text-[28px]">{scheduled.length}</p>
          <p className="text-[15px] text-muted">Accepted and waiting to publish</p>
        </Panel>
        <Panel title="Documents">
          <p className="text-[28px]">{data.assets.length}</p>
          <p className="text-[15px] text-muted">{publicAssets.length} public</p>
        </Panel>
        <Panel title="Linked research">
          <p className="text-[28px]">
            {new Set(data.assets.flatMap((asset) => asset.itemIds)).size}
          </p>
          <p className="text-[15px] text-muted">Research with at least one document</p>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Public research and its documents"
          actions={
            <button type="button" className="admin-mini-btn" onClick={() => onNavigate("items")}>
              MANAGE RESEARCH
            </button>
          }
        >
          {publicItems.length === 0 ? (
            <p className="text-[16px] text-muted">No public research yet.</p>
          ) : (
            <ul className="space-y-3">
              {publicItems.map((item) => {
                const documents = documentsFor(item.id);
                return (
                  <li key={item.id} className="border-b-2 border-line pb-3 last:border-0 last:pb-0">
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-2 text-left hover:bg-paper"
                      onClick={() => onNavigate("items")}
                    >
                      <span className="text-[16px] font-bold leading-tight">{item.title}</span>
                      <span className="text-[15px] text-muted">
                        {STATUS_LABELS[item.status]} ·{" "}
                        {statusProgress(item.status, item.progressPct)}%
                      </span>
                    </button>
                    {documents.length === 0 ? (
                      <p className="mt-1 text-[15px] text-muted">No documents linked.</p>
                    ) : (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {documents.map((document) => (
                          <li key={document.id}>
                            <a
                              className="admin-mini-btn inline-block"
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              title={`${document.label} · ${document.visibility}`}
                            >
                              {document.label}
                              {document.visibility === "private" ? " · private" : ""}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Document library"
          actions={
            <button type="button" className="admin-mini-btn" onClick={() => onNavigate("assets")}>
              MANAGE DOCUMENTS
            </button>
          }
        >
          {data.assets.length === 0 ? (
            <p className="text-[16px] text-muted">No documents yet.</p>
          ) : (
            <ul className="divide-y-2 divide-line">
              {[...data.assets]
                .sort(
                  (a, b) =>
                    Number(b.visibility === "public") - Number(a.visibility === "public") ||
                    b.updatedAt.localeCompare(a.updatedAt),
                )
                .slice(0, 10)
                .map((document) => {
                  const linked = document.itemIds
                    .map((id) => itemById.get(id)?.title)
                    .filter((title): title is string => Boolean(title));
                  return (
                    <li key={document.id} className="py-2 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[16px] leading-tight hover:underline"
                        >
                          {document.label}
                        </a>
                        <span className="text-[15px] text-muted">
                          {ASSET_KIND_LABELS[document.kind]} · {document.visibility}
                        </span>
                      </div>
                      <p className="text-[15px] text-muted">
                        {linked.length > 0 ? linked.join(" · ") : "Not linked to research"}
                      </p>
                    </li>
                  );
                })}
            </ul>
          )}
          {data.assets.length > 10 ? (
            <p className="mt-2 text-[15px] text-muted">
              Showing 10 of {data.assets.length}. Open Documents for the full list.
            </p>
          ) : null}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title={`Exposure warnings (${warnings.length})`}>
          {warnings.length === 0 ? (
            <p className="text-[16px]">No warnings. Safe to continue with the publication check.</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((warning) => (
                <li key={warning.id}>
                  <button
                    type="button"
                    className="admin-warning w-full text-left"
                    onClick={() => onNavigate("items")}
                  >
                    {warning.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-[15px] text-muted">
        Last data update: {formatDate(
          [...data.items.map((item) => item.updatedAt), ...data.assets.map((asset) => asset.updatedAt)]
            .sort()
            .at(-1) ?? new Date().toISOString(),
        )}
      </p>
    </div>
  );
}
