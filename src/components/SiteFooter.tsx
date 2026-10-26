import { Link } from "react-router-dom";
import { profile } from "../data";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t-[3px] border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-pixel text-[13px] leading-5">
            <img
              src="/logo.svg"
              alt=""
              width="28"
              height="28"
              className="h-7 w-7 border-2 border-line [image-rendering:pixelated]"
            />
            NUSEA<span className="text-orange">.</span>
          </p>
          <p className="mt-2 max-w-md text-[18px] text-muted">
            {profile?.tagline || "Independent research lab."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[18px]">
          <Link to="/database" className="pixel-link">
            Database
          </Link>
          <Link to="/about" className="pixel-link">
            About
          </Link>
          <Link to="/pipeline" className="pixel-link">
            Pipeline
          </Link>
          <span className="text-muted">
            © {year} {profile?.name || "Nusea"}
          </span>
        </div>
      </div>
    </footer>
  );
}
