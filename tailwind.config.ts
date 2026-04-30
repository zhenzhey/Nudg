import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Core palette (Atlas — cool neutral + cyan AI accent) ──────────
        // The whole app uses these tokens; the old lavender/purple theme is retired.
        background: "#fafbfc",      // atlas warm-white page bg
        surface: {
          DEFAULT: "#ffffff",       // atlas panel — cards, sheets
          muted: "#f3f5f8",         // atlas panel-2
          container: "#f3f5f8",     // atlas panel-2
          "container-low": "#f6f8fa",
          "container-lowest": "#ffffff",
          "container-high": "#eaeef3",
          "container-highest": "#e3e7ec",
        },
        primary: {
          DEFAULT: "#0891b2",       // atlas cyan-700 — quiet AI accent, matches design
          dim: "#0e7490",
          hover: "#0e7490",
          light: "#22d3ee",
          container: "#cffafe",     // atlas ai-soft
          muted: "rgba(8, 145, 178, 0.12)",
        },
        neutral: {
          DEFAULT: "#0f1722",       // atlas fg — used for dark CTAs
          muted: "rgba(15, 23, 34, 0.08)",
        },
        secondary: {
          DEFAULT: "#5b6878",       // atlas dim
          container: "#f3f5f8",
        },
        tertiary: {
          DEFAULT: "#5b6878",       // atlas dim — secondary text
          container: "#eaeef3",
        },
        error: {
          DEFAULT: "#B91C1C",
          container: "#FEE2E2",
        },
        outline: {
          DEFAULT: "#e3e7ec",       // atlas border
          variant: "#c7cfd9",       // atlas border-hi
        },
        // "on-" tokens
        "on-surface": "#0f1722",          // atlas fg — primary text
        "on-surface-variant": "#5b6878",  // atlas dim — secondary text
        "on-background": "#0f1722",
        "on-primary": "#ffffff",
        "on-neutral": "#ffffff",
        "on-secondary": "#ffffff",
        "on-tertiary": "#ffffff",
        "on-error": "#ffffff",
        "inverse-on-surface": "#9aa5b3",  // atlas dimmer — placeholder
        // Backward-compat aliases
        bg: "#fafbfc",
        border: {
          DEFAULT: "rgba(227, 231, 236, 0.8)",
          2: "rgba(199, 207, 217, 0.9)",
        },
        text: {
          primary: "#0f1722",
          secondary: "#5b6878",
          muted: "#9aa5b3",
        },
        accent: {
          DEFAULT: "#0891b2",
          muted: "rgba(8, 145, 178, 0.12)",
        },
        success: {
          DEFAULT: "#0f8c4a",       // atlas done
          light: "#22C55E",
          muted: "rgba(15, 140, 74, 0.10)",
        },
        warning: {
          DEFAULT: "#b45309",       // atlas warn
          muted: "rgba(180, 83, 9, 0.10)",
        },
        danger: {
          DEFAULT: "#B91C1C",
          muted: "rgba(185, 28, 28, 0.10)",
        },
        // ── Atlas direction palette (cool blue-gray + cyan AI accent) ────
        // Used by the dashboard. Mapped 1:1 from design/atlas.jsx so visual
        // tweaks should round-trip cleanly with the design source.
        atlas: {
          bg: "#fafbfc",
          panel: "#ffffff",
          "panel-2": "#f3f5f8",
          border: "#e3e7ec",
          "border-hi": "#c7cfd9",
          fg: "#0f1722",
          dim: "#5b6878",
          dimmer: "#9aa5b3",
          ai: "#0891b2",            // cyan-700 — design's quiet AI accent
          "ai-deep": "#0e7490",     // cyan-800 for hover/dim states
          "ai-soft": "#cffafe",
          warn: "#b45309",
          done: "#0f8c4a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        headline: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
        "card-hover": "0 4px 24px rgba(15, 23, 42, 0.10)",
        "card-lg": "0 8px 32px rgba(15, 23, 42, 0.08)",
        // keep old names
        kinetic: "0 4px 16px rgba(15, 23, 42, 0.06)",
        "kinetic-sm": "0 2px 8px rgba(15, 23, 42, 0.04)",
        "kinetic-card": "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-in-out",
        "slide-up": "slideUp 0.35s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
