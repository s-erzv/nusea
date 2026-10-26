/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./admin/**/*.{ts,tsx}", "./admin/index.html"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        sky: "var(--sky)",
        orange: "var(--orange)",
        yellow: "var(--yellow)",
        card: "var(--card)",
        muted: "var(--muted)",
        line: "var(--line)",
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
        body: ["'VT323'", "monospace"],
      },
      boxShadow: {
        hard: "4px 4px 0 var(--shadow)",
        "hard-sm": "2px 2px 0 var(--shadow)",
        "hard-lg": "6px 6px 0 var(--shadow)",
      },
    },
  },
  plugins: [],
};
