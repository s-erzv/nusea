import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { AboutPage } from "./pages/AboutPage";
import { AssetsPage } from "./pages/AssetsPage";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResearchDetailPage } from "./pages/ResearchDetailPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-[3px] focus:border-line focus:bg-yellow focus:px-4 focus:py-3 focus:text-[#14213D]"
      >
        Lompat ke konten
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="konten" className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/riset/:slug" element={<ResearchDetailPage />} />
          <Route path="/aset" element={<AssetsPage />} />
          <Route path="/peta" element={<MapPage />} />
          <Route path="/tentang" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
