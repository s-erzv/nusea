import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { AboutPage } from "./pages/AboutPage";
import { AssetsPage } from "./pages/AssetsPage";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResearchDetailPage } from "./pages/ResearchDetailPage";

function LegacyResearchRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/research/${slug ?? ""}`} replace />;
}

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
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-[3px] focus:border-line focus:bg-yellow focus:px-4 focus:py-3 focus:text-[#14213D]"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="content" className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/research/:slug" element={<ResearchDetailPage />} />
          <Route path="/documents" element={<AssetsPage />} />
          <Route path="/pipeline" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/database" element={<Navigate to="/documents" replace />} />
          <Route path="/aset" element={<Navigate to="/documents" replace />} />
          <Route path="/peta" element={<Navigate to="/pipeline" replace />} />
          <Route path="/tentang" element={<Navigate to="/about" replace />} />
          <Route path="/riset/:slug" element={<LegacyResearchRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
