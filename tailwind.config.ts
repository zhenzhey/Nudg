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
        // Core backgrounds
        bg: "#050505",
        surface: {
          DEFAULT: "#0F0F0F",
          2: "#171717",
          3: "#1E1E1E",
        },
        // Borders
        border: {
          DEFAULT: "#222222",
          2: "#2E2E2E",
        },
        // Brand color — indigo
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#818CF8",
          muted: "#6366F120",
        },
        // Accent — violet
        accent: {
          DEFAULT: "#A78BFA",
          muted: "#A78BFA20",
        },
        // Status colors
        success: {
          DEFAULT: "#10B981",
          light: "#34D399",
          muted: "#10B98120",
        },
        warning: {
          DEFAULT: "#F59E0B",
          muted: "#F59E0B20",
        },
        danger: {
          DEFAULT: "#EF4444",
          muted: "#EF444420",
        },
        // Typography
        text: {
          primary: "#F9FAFB",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
