import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AssetsPage } from "./pages/AssetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GrantsPage } from "./pages/GrantsPage";
import { IdeasPage } from "./pages/IdeasPage";
import { ItemsPage } from "./pages/ItemsPage";
import { KanbanPage } from "./pages/KanbanPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SourcesPage } from "./pages/SourcesPage";
import { TasksPage } from "./pages/TasksPage";
import { TrackerPage } from "./pages/TrackerPage";
import {
  ApiError,
  adminApi,
  fetchSession,
  login,
  logout,
  setToken,
} from "./lib/api";
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
      { tab: "tracker", label: "Tracker", mark: "T" },
      { tab: "items", label: "Research", mark: "R" },
      { tab: "kanban", label: "Pipeline", mark: "K" },
      { tab: "assets", label: "Documents", mark: "D" },
    ],
  },
  {
    group: "System",
    items: [
      { tab: "profile", label: "Profile", mark: "P" },
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
  const [gate, setGate] = useState<"checking" | "login" | "token" | "ready">(
    "checking",
  );
  const [online, setOnline] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const versionsRef = useRef<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<AdminTab>(() => {
    const hash = window.location.hash.slice(1);
    return (ALL_TABS as string[]).includes(hash) ? (hash as AdminTab) : "tracker";
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
    setVersions(result.updatedAt);
    versionsRef.current = result.updatedAt;
    setLoadError("");
  }, []);

  useEffect(() => {
    let active = true;
    void fetchSession().then((session) => {
      if (!active) return;
      setOnline(session.online);
      if (session.authenticated) {
        setGate("ready");
      } else {
        setGate(session.online ? "login" : "token");
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    let active = true;
    setLoading(true);
    adminApi
      .bootstrap()
      .then((result) => {
        if (!active) return;
        setData(result.data);
        setVersions(result.updatedAt);
    versionsRef.current = result.updatedAt;
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Could not load data.";
        if (message.includes("401") || message.includes("Token")) {
          setGate(online ? "login" : "token");
        }
        setLoadError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gate, online]);

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
      const result = await adminApi.saveEntity(entity, value, versionsRef.current[entity]);
      await refresh();
      return result.backupPath;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await refresh();
        throw new Error("Data changed elsewhere. The latest version was reloaded; review your edit before saving again.");
      }
      if (error instanceof Error && error.message.includes("401")) {
        void fetchSession().then((session) =>
          setGate(session.online ? "login" : "token"),
        );
      }
      throw error;
    }
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      await login(passwordInput);
      setPasswordInput("");
      setGate("ready");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  function submitLocalToken(event: FormEvent) {
    event.preventDefault();
    if (!tokenInput.trim()) return;
    setToken(tokenInput.trim());
    setGate("ready");
  }

  if (gate === "login") {
    return (
      <div className="admin-token-screen">
        <form className="admin-token-card" onSubmit={(event) => void submitLogin(event)}>
          <img className="admin-auth-logo" src="/favicon.svg" alt="" width={56} height={56} />
          <p className="font-pixel text-[12px] uppercase leading-5 text-orange">
            Nusea / Back Office
          </p>
          <h1 className="mt-3 text-[22px] leading-relaxed">Masuk ke admin</h1>
          <p className="mt-2 text-[17px] leading-snug text-muted">
            Data penelitian ini privat. Masukkan password admin untuk membuka
            tracker.
          </p>
          <label className="mt-5 block font-pixel text-[12px] uppercase leading-4" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="pixel-input admin-input mt-1"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {authError || loadError ? (
            <p className="admin-warning mt-3">{authError || loadError}</p>
          ) : null}
          <button
            type="submit"
            className="pixel-btn mt-4"
            disabled={authBusy || !passwordInput}
          >
            {authBusy ? "MEMBUKA…" : "MASUK"}
          </button>
        </form>
      </div>
    );
  }

  if (gate === "token") {
    return (
      <div className="admin-token-screen">
        <form className="admin-token-card" onSubmit={submitLocalToken}>
          <img className="admin-auth-logo" src="/favicon.svg" alt="" width={56} height={56} />
          <p className="font-pixel text-[12px] uppercase leading-5 text-orange">
            Nusea / Back Office
          </p>
          <h1 className="mt-3 text-[22px] leading-relaxed">Session token required</h1>
          <p className="mt-2 text-[17px] leading-snug text-muted">
            Token dicetak di terminal saat <code>pnpm run admin</code>. Server
            lokal hanya menerima koneksi dari 127.0.0.1.
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

  if (gate === "checking" || (loading && !data)) {
    return (
      <div className="admin-token-screen">
        <div className="admin-token-card">
          <img className="admin-auth-logo" src="/favicon.svg" alt="" width={56} height={56} />
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
          <img className="admin-brand-logo" src="/favicon.svg" alt="" width={44} height={44} />
          <div>
            <p className="font-pixel text-[13px] leading-4">NUSEA</p>
            <p className="font-pixel text-[10px] uppercase leading-4 text-muted">
              Back Office
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
            {online ? "Online · Neon · auto backup" : "Local · Neon · auto backup"}
          </p>
          {online ? null : (
            <a
              href="http://127.0.0.1:5173"
              target="_blank"
              rel="noreferrer"
              className="pixel-link mt-2 inline-block text-[15px]"
            >
              Open public site ↗
            </a>
          )}
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
            <span className="admin-local-badge">
              {online ? "ONLINE" : "LOCAL"}
            </span>
            <button
              type="button"
              className="pixel-btn pixel-btn-ghost admin-topbar-btn"
              onClick={toggleTheme}
            >
              {dark ? "LIGHT" : "DARK"}
            </button>
            {online ? (
              <button
                type="button"
                className="pixel-btn pixel-btn-ghost admin-topbar-btn"
                onClick={() => {
                  void logout().then(() => {
                    setData(null);
                    setGate("login");
                  });
                }}
              >
                KELUAR
              </button>
            ) : null}
          </div>
        </header>

        <main className="admin-content">
          {tab === "dashboard" ? <DashboardPage data={data} onNavigate={navigate} /> : null}
          {tab === "items" ? (
            <ItemsPage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
          {tab === "tracker" ? (
            <TrackerPage
              data={data}
              refresh={refresh}
              notify={notify}
              versions={versions}
              saveEntity={saveEntity}
            />
          ) : null}
          {tab === "kanban" ? (
            <KanbanPage data={data} refresh={refresh} notify={notify} versions={versions} />
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
          {tab === "profile" ? (
            <ProfilePage data={data} saveEntity={saveEntity} notify={notify} />
          ) : null}
        </main>

        <footer className="admin-footer">
          NUSEA · back office · {new Date().getFullYear()}
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
