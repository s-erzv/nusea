import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { FileText, FlaskConical, Moon, Search, Sun, Workflow } from "lucide-react";
import { cn } from "../lib/format";
import { useTheme } from "../lib/useTheme";
import { ScrollProgress } from "./motion";

const links = [
  { to: "/", label: "Research", end: true, icon: FlaskConical },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/pipeline", label: "Pipeline", icon: Workflow },
];

function isActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to || pathname.startsWith("/research");
  return pathname.startsWith(to);
}

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-line bg-sky/95 backdrop-blur-sm">
      <ScrollProgress />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <NavLink
          to="/"
          className="group flex min-h-11 items-center gap-2 font-pixel text-[15px] leading-tight"
          aria-label="Nusea, home"
        >
          <motion.img
            src="/logo.svg"
            alt=""
            width="36"
            height="36"
            whileHover={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.4 }}
            className="h-9 w-9 border-[3px] border-line shadow-hard-sm [image-rendering:pixelated]"
          />
          <span>
            NUSEA<span className="text-orange">.</span>
          </span>
        </NavLink>

        <button
          type="button"
          className="order-2 ml-auto flex min-h-10 items-center gap-2 border-2 border-line bg-card px-2 font-pixel text-[11px] shadow-hard-sm transition-transform hover:-translate-y-0.5 hover:bg-yellow hover:text-[#14213D] active:translate-y-0 sm:order-3 sm:ml-2"
          onClick={() => window.dispatchEvent(new Event("nusea:command"))}
          aria-label="Open search and commands"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span>SEARCH</span>
          <kbd className="border border-line bg-paper px-1 text-[10px] text-muted">⌘K</kbd>
        </button>

        <button
          type="button"
          className="pixel-btn pixel-btn-ghost pixel-btn-small order-2 ml-2 w-11 overflow-hidden px-0 sm:order-3"
          onClick={toggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ y: -18, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 18, rotate: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-flex"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </motion.span>
          </AnimatePresence>
        </button>

        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-2 sm:ml-auto sm:w-auto"
        >
          {links.map((link) => {
            const active = isActive(pathname, link.to, link.end);
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={cn(
                  "relative flex min-h-10 items-center gap-1.5 px-2.5 py-2 font-pixel text-[12px] leading-4",
                  !active && "hover:text-orange",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 border-2 border-line bg-card shadow-hard-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                ) : null}
                <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
                <span className="relative">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
