import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        titleAs="h1"
        title="404 — PAGE NOT FOUND"
        body="The page you are looking for does not exist."
        action={
          <Link to="/" className="pixel-btn">
            BACK TO RESEARCH
          </Link>
        }
      />
    </div>
  );
}
