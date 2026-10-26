import { useCallback, useEffect, useState } from "react";
import { AssetsPage } from "./pages/AssetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DataPage } from "./pages/DataPage";
import { GrantsPage } from "./pages/GrantsPage";
import { IdeasPage } from "./pages/IdeasPage";
import { ItemsPage } from "./pages/ItemsPage";
import { KanbanPage } from "./pages/KanbanPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublishPage } from "./pages/PublishPage";
import { SourcesPage } from "./pages/SourcesPage";
import { TasksPage } from "./pages/TasksPage";
import { VenuesPage } from "./pages/VenuesPage";
import { adminApi, hasToken, setToken } from "./lib/api";
import type { AdminData, AdminTab, Notify, SaveEntity } from "./lib/types";

interface NavItem {
  tab: AdminTab;
  label: string;
  mark: string;
}

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "Workspace",
    items: [{ tab: "dashboard", label: "Dashboard", mark: "D" }],
  },
  {
    group: "Research",
    items: [
      { tab: "items", label: "Research", mark: "R" },
      { tab: "kanban", label: "Pipeline", mark: "K" },
      { tab: "assets", label: "Documents", mark: "D" },
      { tab: "venues", label: "Venues", mark: "V" },
    ],
  },
  {
    group: "System",
    items: [
      { tab: "profile", label: "Profile", mark: "P" },
      { tab: "data", label: "Data", mark: "F" },
      { tab: "publish", label: "Publish", mark: "!" },
    ],
  },
];

const ALL_TABS = NAV.flatMap((group) => group.items.map((item) => item.tab));

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

export default function App() {
  const [needsToken, setNeedsToken] = useState(!hasToken());
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<AdminTab>(() => {
    const hash = window.location.hash.slice(1);
    return (ALL_TABS as string[]).includes(hash) ? (hash as AdminTab) : "dashboard";
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const notify: Notify = useCallback((message, tone = "ok") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const refresh = useCallback(async () => {
    const result = await adminApi.bootstrap();
    setData(result.data);
    setLoadError("");
  }, []);

  useEffect(() => {
    if (needsToken) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    adminApi
      .bootstrap()
      .then((result) => {
        if (!active) return;
        setData(result.data);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Could not load data.";
        if (message.includes("401") || message.includes("Token")) {
          setNeedsToken(true);
        }
        setLoadError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [needsToken]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.title = `Nusea Admin — ${tab}`;
  }, [tab]);

  function navigate(next: AdminTab) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nusea-theme", next ? "dark" : "light");
  }

  async function saveEntity(entity: Parameters<SaveEntity>[0], value: unknown) {
    try {
      const result = await adminApi.saveEntity(entity, value);
      await refresh();
      return result.backupPath;
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        setNeedsToken(true);
      }
      throw error;
    }
  }

  if (needsToken) {
    return (
      <div className="admin-token-screen">
        <form
          className="admin-token-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (!tokenInput.trim()) return;
            setToken(tokenInput.trim());
            setNeedsToken(false);
            setLoading(true);
          }}
        >
          <p className="font-pixel text-[12px] uppercase leading-5 text-orange">
            Nusea / Back Office
          </p>
          <h1 className="mt-3 text-[22px] leading-relaxed">Session token required</h1>
          <p className="mt-2 text-[17px] leading-snug text-muted">
            The token is printed in the terminal when you run <code>pnpm run admin</code>.
            Do not share it; the server only accepts connections from 127.0.0.1.
          </p>
          <label className="mt-5 block font-pixel text-[12px] uppercase leading-4" htmlFor="token">
            Admin token
          </label>
          <input
            id="token"
            className="pixel-input admin-input mt-1"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {loadError ? <p className="admin-warning mt-3">{loadError}</p> : null}
          <button type="submit" className="pixel-btn mt-4" disabled={!tokenInput.trim()}>
            SIGN IN
          </button>
        </form>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="admin-token-screen">
        <div className="admin-token-card">
          <p className="font-pixel text-[12px] uppercase leading-5 text-orange">
            Nusea / Back Office
          </p>
          <p className="mt-4 text-[20px]">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-token-screen">
        <div className="admin-token-card">
          <h1 className="text-[20px]">Could not load data</h1>
          <p className="admin-warning mt-3">{loadError || "Unknown error."}</p>
          <button
            type="button"
            className="pixel-btn mt-4"
            onClick={() => {
              setNeedsToken(false);
              setLoading(true);
              void refresh()
                .catch((error: unknown) =>
                  setLoadError(
                    error instanceof Error ? error.message : "Could not load.",
                  ),
                )
                .finally(() => setLoading(false));
            }}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const openTasks = data.tasks.filter((task) => !task.done).length;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-block">N</span>
          <div>
            <p className="font-pixel text-[13px] leading-4">NUSEA</p>
            <p className="font-pixel text-[10px] uppercase leading-4 text-muted">
              Back Office / Local
            </p>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV.map((group) => (
            <div key={group.group} className="admin-nav-group">
              <p className="admin-nav-title">{group.group}</p>
              {group.items.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  className="admin-nav-link"
                  data-active={tab === item.tab}
                  aria-current={tab === item.tab ? "page" : undefined}
                  onClick={() => navigate(item.tab)}
                >
                  <span className="admin-nav-mark">{item.mark}</span>
                  <span>{item.label}</span>
                  {item.tab === "tasks" && openTasks > 0 ? (
                    <span className="admin-count">{openTasks}</span>
                  ) : null}
                  {item.tab === "items" ? (
                    <span className="admin-count">{data.items.length}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <p className="font-pixel text-[10px] uppercase leading-4 text-muted">
            {data.profile.name || "Nusea"}
          </p>
          <p className="text-[15px] leading-snug text-muted">
            Local data · 20 backups · no Supabase
          </p>
          <a
            href="http://127.0.0.1:5173"
            target="_blank"
            rel="noreferrer"
            className="pixel-link mt-2 inline-block text-[15px]"
          >
            Open public site ↗
          </a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
              Workspace / {tab}
            </p>
            <p className="text-[15px] text-muted">
              {data.profile.handle} · {data.profile.campus || "campus not set"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-local-badge">127.0.0.1</span>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost admin-topbar-btn"
              onClick={toggleTheme}
            >
              {dark ? "LIGHT" : "DARK"}
            </button>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost admin-topbar-btn"
              onClick={() => navigate("publish")}
            >
              PUBLISH
            </button>
          </div>
        </header>

        <main className="admin-content">
          {tab === "dashboard" ? <DashboardPage data={data} onNavigate={navigate} /> : null}
          {tab === "items" ? (
            <ItemsPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "kanban" ? (
            <KanbanPage data={data} refresh={refresh} notify={notify} />
          ) : null}
          {tab === "assets" ? (
            <AssetsPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "sources" ? (
            <SourcesPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "grants" ? (
            <GrantsPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "ideas" ? (
            <IdeasPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "tasks" ? (
            <TasksPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "venues" ? (
            <VenuesPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "profile" ? (
            <ProfilePage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "data" ? (
            <DataPage
              data={data}
              saveEntity={saveEntity}
              notify={notify}
              refresh={refresh}
            />
          ) : null}
          {tab === "publish" ? <PublishPage notify={notify} refresh={refresh} /> : null}
        </main>

        <footer className="admin-footer">
          NUSEA · local-only admin · {new Date().getFullYear()}
        </footer>
      </div>

      {toast ? (
        <div
          key={toast.id}
          className="admin-toast"
          data-tone={toast.tone}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
