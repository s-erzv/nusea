import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { loadPublicData } from "./data";
import "./index.css";

const container = document.getElementById("root")!;
const root = createRoot(container);

function renderApp() {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

root.render(
  <div className="flex min-h-screen items-center justify-center bg-paper px-4">
    <div className="pixel-card p-5 text-center text-[18px] text-muted">
      Loading research data…
    </div>
  </div>,
);

loadPublicData()
  .then(renderApp)
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Could not load public data.";
    root.render(
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="pixel-card max-w-lg p-5 text-center">
          <h1 className="text-[20px]">DATA UNAVAILABLE</h1>
          <p className="mt-3 text-[18px] leading-snug text-muted">{message}</p>
          <p className="mt-2 text-[17px] leading-snug text-muted">
            This site reads live from the database. Check the public API connection.
          </p>
          <button
            type="button"
            className="pixel-btn mt-4"
            onClick={() => window.location.reload()}
          >
            TRY AGAIN
          </button>
        </div>
      </div>,
    );
  });
