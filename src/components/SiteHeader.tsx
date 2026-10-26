import { NavLink } from "react-router-dom";
import { cn } from "../lib/format";
import { useTheme } from "../lib/useTheme";

const links = [
  { to: "/", label: "Research", end: true },
  { to: "/database", label: "Database" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/about", label: "About" },
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
          className="pixel-btn pixel-btn-ghost pixel-btn-small order-2 ml-auto sm:order-3 sm:ml-2"
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
