import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Halaman tidak ditemukan");
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        titleAs="h1"
        title="404 — AREA BELUM TERBUKA"
        body="Halaman yang kamu cari tidak ada di peta ini."
        action={
          <Link to="/" className="pixel-btn">
            KEMBALI KE BERANDA
          </Link>
        }
      />
    </div>
  );
}
