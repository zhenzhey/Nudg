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
        // ── Core palette (from design system reference) ──────────
        background: "#ECEFFE",      // light lavender page bg
        surface: {
          DEFAULT: "#FFFFFF",       // white — cards, panels
          muted: "#F4F5FF",         // very slightly tinted white
          container: "#EEF0FF",     // light lavender container
          "container-low": "#E8EAFF",
          "container-lowest": "#FFFFFF",
          "container-high": "#D8DAFF",
          "container-highest": "#CDD0FF",
        },
        primary: {
          DEFAULT: "#5E6AD2",       // purple-blue accent
          dim: "#4F5ABE",
          hover: "#4F5ABE",
          light: "#7B86E0",
          container: "#E8EAFF",
          muted: "rgba(94, 106, 210, 0.12)",
        },
        neutral: {
          DEFAULT: "#0F172A",       // dark navy — used for dark CTAs
          muted: "rgba(15, 23, 42, 0.08)",
        },
        secondary: {
          DEFAULT: "#78767A",
          container: "#F0EFF1",
        },
        tertiary: {
          DEFAULT: "#6C7791",       // blue-gray, used for secondary text
          container: "#E8EAF5",
        },
        error: {
          DEFAULT: "#B91C1C",
          container: "#FEE2E2",
        },
        outline: {
          DEFAULT: "#CBD0E0",
          variant: "#D8DAF0",
        },
        // "on-" tokens
        "on-surface": "#0F172A",          // very dark navy — primary text
        "on-surface-variant": "#6C7791",  // tertiary — secondary text
        "on-background": "#0F172A",
        "on-primary": "#FFFFFF",
        "on-neutral": "#FFFFFF",
        "on-secondary": "#FFFFFF",
        "on-tertiary": "#FFFFFF",
        "on-error": "#FFFFFF",
        "inverse-on-surface": "#9BA3C0",  // placeholder text
        // Backward-compat aliases
        bg: "#ECEFFE",
        border: {
          DEFAULT: "rgba(203, 208, 224, 0.6)",
          2: "rgba(203, 208, 224, 0.9)",
        },
        text: {
          primary: "#0F172A",
          secondary: "#6C7791",
          muted: "#9BA3C0",
        },
        accent: {
          DEFAULT: "#7B86E0",
          muted: "rgba(123, 134, 224, 0.12)",
        },
        success: {
          DEFAULT: "#15803D",
          light: "#22C55E",
          muted: "rgba(21, 128, 61, 0.10)",
        },
        warning: {
          DEFAULT: "#B45309",
          muted: "rgba(180, 83, 9, 0.10)",
        },
        danger: {
          DEFAULT: "#B91C1C",
          muted: "rgba(185, 28, 28, 0.10)",
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
