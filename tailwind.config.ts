import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        background: "#F8FAFC",
        text: "#0F172A",

        // Brand / primary (teal)
        primary: "#0F766E",
        navy: "#053B40",

        // Sidebar (deep green)
        sidebar: "#064E3B",
        "sidebar-dark": "#053B2D",

        // Legacy aliases kept so existing class names keep working,
        // re-pointed at the new teal palette.
        "color-bg": "#F8FAFC",
        "color-card": "#FFFFFF",
        "color-primary": "#0F766E",
        "color-primary-dark": "#115E59",
        "color-text-main": "#0F172A",
        "color-text-muted": "#64748B",
        "color-border": "#E2E8F0",
        "color-input-bg": "#FFFFFF",
        "color-soft-blue": "#F0FDFA",
        "color-danger": "#EF4444",

        // Semantic accents
        "accent-success": "#10B981",
        "accent-info": "#3B82F6",
        "accent-warning": "#F59E0B",
        "accent-danger": "#EF4444",
        "accent-purple": "#7C3AED",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans Mongolian",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.05)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.05)",
        input: "0 0 0 4px rgba(15, 118, 110, 0.10)",
        btn: "0 6px 16px rgba(15, 118, 110, 0.22)",
      },
      borderRadius: {
        card: "18px",
        section: "16px",
        input: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
