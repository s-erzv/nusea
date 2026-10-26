import { useMemo } from "react";
import {
  GRANT_STAGE_LABELS,
  STATUS_LABELS,
  isGrantOutputWarningActive,
} from "../../shared/constants";
import { statusProgress } from "../../shared/status";
import { PageHeader, Panel } from "../components/layout";
import type { AdminData, AdminTab } from "../lib/types";
import { daysUntil, formatDate, formatIdr, todayIso } from "../lib/helpers";

interface DashboardPageProps {
  data: AdminData;
  onNavigate: (tab: AdminTab) => void;
}

interface Deadline {
  label: string;
  date: string;
  meta: string;
  tab: AdminTab;
}

export function DashboardPage({ data, onNavigate }: DashboardPageProps) {
  const today = todayIso();
  const openTasks = data.tasks.filter((task) => !task.done);
  const publicItems = data.items.filter((item) => item.visibility === "public");
  const publishedPrivate = data.items.filter(
    (item) => item.status === "published" && item.visibility !== "public",
  );
  const publicUnready = data.items.filter(
    (item) =>
      item.visibility === "public" &&
      !["accepted", "published"].includes(item.status),
  );
  const warnings = [
    ...publishedPrivate.map((item) => ({
      id: `published-${item.id}`,
      text: `"${item.title}" berstatus terbit tetapi masih privat.`,
      tab: "items" as AdminTab,
    })),
    ...publicUnready.map((item) => ({
      id: `unready-${item.id}`,
      text: `"${item.title}" publik tetapi status ${STATUS_LABELS[item.status]}. Cek kelayakan.`,
      tab: "items" as AdminTab,
    })),
    ...data.grants
      .filter((grant) => isGrantOutputWarningActive(grant.selectionStage))
      .map((grant) => ({
        id: `grant-${grant.id}`,
        text: `${grant.scheme}: luaran wajib terbit setelah dana diterima (${GRANT_STAGE_LABELS[grant.selectionStage]}).`,
        tab: "grants" as AdminTab,
      })),
    ...(data.profile.visibility === "public"
      ? []
      : [
          {
            id: "profile-private",
            text: "Profil masih privat; situs publik memakai fallback.",
            tab: "profile" as AdminTab,
          },
        ]),
  ];

  const deadlines = useMemo(() => {
    const rows: Deadline[] = [];
    for (const task of openTasks) {
      if (task.dueAt) {
        rows.push({
          label: task.title,
          date: task.dueAt,
          meta: "Tugas",
          tab: "tasks",
        });
      }
    }
    for (const grant of data.grants) {
      if (grant.proposalDeadline) {
        rows.push({
          label: `Proposal ${grant.scheme}`,
          date: grant.proposalDeadline,
          meta: "Deadline hibah",
          tab: "grants",
        });
      }
      if (grant.outputDeadline) {
        rows.push({
          label: `Luaran ${grant.scheme}`,
          date: grant.outputDeadline,
          meta: "Deadline luaran",
          tab: "grants",
        });
      }
    }
    return rows
      .filter((row) => row.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [data.grants, openTasks, today]);

  const recent = [...data.items]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const totalFunding = data.grants.reduce(
    (total, grant) =>
      isGrantOutputWarningActive(grant.selectionStage) ? total + grant.maxFundingIdr : 0,
    0,
  );

  return (
    <div>
      <PageHeader
        kicker="Overview / Save Room"
        title="Dashboard"
        description="Ringkasan pipeline, tenggat, dan risiko eksposur. Data admin hanya hidup di mesin ini."
        actions={
          <a
            className="pixel-btn pixel-btn-ghost"
            href="http://127.0.0.1:5173"
            target="_blank"
            rel="noreferrer"
          >
            BUKA SITUS PUBLIK
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Riset aktif">
          <p className="text-[28px] text-orange">{data.items.length}</p>
          <p className="text-[15px] text-muted">
            {publicItems.length} publik · {data.items.length - publicItems.length} privat
          </p>
        </Panel>
        <Panel title="Menunggu tindakan">
          <p className="text-[28px]">{openTasks.length}</p>
          <p className="text-[15px] text-muted">
            {openTasks.filter((task) => task.dueAt === today).length} jatuh tempo hari ini
          </p>
        </Panel>
        <Panel title="Aset">
          <p className="text-[28px]">{data.assets.length}</p>
          <p className="text-[15px] text-muted">
            {data.assets.filter((asset) => asset.visibility === "public").length} publik
          </p>
        </Panel>
        <Panel title="Dana lolos">
          <p className="text-[20px] text-orange">{formatIdr(totalFunding)}</p>
          <p className="text-[15px] text-muted">Hibah tahap ditetapkan ke atas</p>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Tenggat terdekat"
          actions={
            <button type="button" className="admin-mini-btn" onClick={() => onNavigate("tasks")}>
              LIHAT TUGAS
            </button>
          }
        >
          {deadlines.length === 0 ? (
            <p className="text-[16px] text-muted">Tidak ada tenggat mendatang.</p>
          ) : (
            <ul className="divide-y-2 divide-line">
              {deadlines.map((deadline) => {
                const days = daysUntil(deadline.date);
                return (
                  <li key={`${deadline.meta}-${deadline.label}-${deadline.date}`}>
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left hover:bg-paper"
                      onClick={() => onNavigate(deadline.tab)}
                    >
                      <span>
                        <span className="block text-[16px] leading-tight">{deadline.label}</span>
                        <span className="text-[15px] text-muted">{deadline.meta}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[15px]">{formatDate(deadline.date)}</span>
                        <span
                          className="text-[15px] font-bold"
                          style={{
                            color:
                              days !== null && days <= 3 ? "var(--danger)" : "var(--muted)",
                          }}
                        >
                          {days === 0 ? "Hari ini" : `${days} hari`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={`Peringatan eksposur (${warnings.length})`}>
          {warnings.length === 0 ? (
            <p className="text-[16px]">Tidak ada peringatan. Aman untuk lanjut cek publikasi.</p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((warning) => (
                <li key={warning.id}>
                  <button
                    type="button"
                    className="admin-warning w-full text-left"
                    onClick={() => onNavigate(warning.tab)}
                  >
                    {warning.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Pipeline">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(STATUS_LABELS).map(([status, label]) => {
              const count = data.items.filter((item) => item.status === status).length;
              const sample = data.items.find((item) => item.status === status);
              return (
                <button
                  key={status}
                  type="button"
                  className="border-[3px] border-line bg-card p-2 text-left transition-colors hover:bg-paper"
                  onClick={() => onNavigate("kanban")}
                  title={sample ? `Contoh: ${sample.title}` : "Belum ada item"}
                >
                  <p className="font-pixel text-[7px] uppercase leading-4 text-muted">{label}</p>
                  <p className="mt-1 text-[20px]">{count}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title="Terakhir diperbarui"
          actions={
            <button type="button" className="admin-mini-btn" onClick={() => onNavigate("items")}>
              KELOLA RISET
            </button>
          }
        >
          <ul className="divide-y-2 divide-line">
            {recent.map((item) => (
              <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left hover:bg-paper"
                  onClick={() => onNavigate("items")}
                >
                  <span className="text-[16px] leading-tight">{item.title}</span>
                  <span className="text-[15px] text-muted">
                    {STATUS_LABELS[item.status]} · {statusProgress(item.status, item.progressPct)}% ·{" "}
                    {formatDate(item.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
