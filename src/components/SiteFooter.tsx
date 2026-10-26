import { Link } from "react-router-dom";
import { profile } from "../data";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t-[3px] border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-pixel text-[9px] leading-5">
            NUZA<span className="text-orange">_</span>LAB
          </p>
          <p className="mt-2 max-w-md text-[18px] text-muted">
            {profile?.tagline || "Lab riset pribadi."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[18px]">
          <Link to="/tentang" className="pixel-link">
            Tentang
          </Link>
          <Link to="/peta" className="pixel-link">
            Peta riset
          </Link>
          <span className="text-muted">© {year} {profile?.handle || "Nuza"}</span>
        </div>
      </div>
    </footer>
  );
}
