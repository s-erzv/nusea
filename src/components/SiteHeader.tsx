import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/format";
import { useTheme } from "../lib/useTheme";

const links = [
  { to: "/", label: "Beranda", end: true },
  { to: "/aset", label: "Inventory" },
  { to: "/peta", label: "Peta" },
  { to: "/tentang", label: "Tentang" },
];

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  function goToQuest() {
    const scroll = () =>
      document.getElementById("quests")?.scrollIntoView({ behavior: "smooth" });
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(scroll, 80);
      return;
    }
    scroll();
  }

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-line bg-sky/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <NavLink
          to="/"
          className="group flex min-h-11 items-center gap-2 font-pixel text-[11px] leading-tight"
          aria-label="Nuza Lab, beranda"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center border-[3px] border-line bg-orange text-[9px] text-[#14213D] shadow-hard-sm">
            NL
          </span>
          <span>
            NUZA<span className="text-orange">_</span>LAB
          </span>
        </NavLink>

        <button
          type="button"
          className="pixel-btn pixel-btn-ghost pixel-btn-small order-2 ml-auto sm:order-3 sm:ml-2"
          onClick={toggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={
            theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode malam"
          }
        >
          {theme === "dark" ? "SIANG" : "MALAM"}
        </button>

        <nav
          aria-label="Navigasi utama"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-2 sm:ml-auto sm:w-auto"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "min-h-10 border-2 border-transparent px-2 py-2 font-pixel text-[8px] leading-4",
                  "hover:border-line hover:bg-yellow hover:text-[#14213D]",
                  isActive && "border-line bg-card shadow-hard-sm",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={goToQuest}
            className="min-h-10 border-2 border-transparent px-2 py-2 font-pixel text-[8px] leading-4 hover:border-line hover:bg-yellow hover:text-[#14213D]"
          >
            Quest
          </button>
        </nav>
      </div>
    </header>
  );
}
