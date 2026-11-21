import { NavLink } from "react-router-dom";
import { cn } from "../lib/format";
import { useTheme } from "../lib/useTheme";

const links = [
  { to: "/", label: "Research", end: true },
  { to: "/documents", label: "Documents" },
  { to: "/pipeline", label: "Pipeline" },
];

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-line bg-sky/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <NavLink
          to="/"
          className="group flex min-h-11 items-center gap-2 font-pixel text-[15px] leading-tight"
          aria-label="Nusea, home"
        >
          <img
            src="/logo.svg"
            alt=""
            width="36"
            height="36"
            className="h-9 w-9 border-[3px] border-line shadow-hard-sm [image-rendering:pixelated]"
          />
          <span>
            NUSEA<span className="text-orange">.</span>
          </span>
        </NavLink>

        <button
          type="button"
          className="order-2 ml-auto flex min-h-10 items-center gap-2 border-2 border-line bg-card px-2 font-pixel text-[11px] shadow-hard-sm hover:bg-yellow hover:text-[#14213D] sm:order-3 sm:ml-2"
          onClick={() => window.dispatchEvent(new Event("nusea:command"))}
          aria-label="Open search and commands"
        >
          <span>SEARCH</span>
          <kbd className="border border-line bg-paper px-1 text-[10px] text-muted">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          className="pixel-btn pixel-btn-ghost pixel-btn-small order-2 ml-2 sm:order-3"
          onClick={toggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "LIGHT" : "DARK"}
        </button>

        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-2 sm:ml-auto sm:w-auto"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "min-h-10 border-2 border-transparent px-2 py-2 font-pixel text-[12px] leading-4",
                  "hover:border-line hover:bg-yellow hover:text-[#14213D]",
                  isActive && "border-line bg-card shadow-hard-sm",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
