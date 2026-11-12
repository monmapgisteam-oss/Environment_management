import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { backgroundColor, borderColor, semanticColors, textColor, themeBase } from "./lib/theme/darkPalette";

const config: Config = {
  // `.dark` on <html> (set by components/ui/ThemeToggle.tsx) switches the
  // palette variables in lib/theme/darkPalette.ts; `dark:` works for one-offs.
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // The design uses square corners: every rounded-* step is 0, so existing
    // classes render square. rounded-full stays for real circles (dots,
    // avatars, spinners).
    borderRadius: {
      none: "0",
      sm: "0",
      DEFAULT: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "9999px",
    },
    extend: {
      colors: {
        // Surfaces, legacy aliases and other theme-aware colors (light and
        // dark values live in lib/theme/darkPalette.ts).
        ...semanticColors,

        // Brand / primary (teal)
        primary: "#0F766E",
        navy: "#053B40",

        // Sidebar (deep green)
        sidebar: "#064E3B",
        "sidebar-dark": "#053B2D",

        // Legacy aliases kept so existing class names keep working,
        // re-pointed at the new teal palette.
        "color-primary": "#0F766E",
        "color-primary-dark": "#115E59",
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
      backgroundColor,
      textColor,
      borderColor,
      ringColor: borderColor,
      placeholderColor: textColor,
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.05)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.05)",
        input: "0 0 0 4px rgba(15, 118, 110, 0.10)",
        btn: "0 6px 16px rgba(15, 118, 110, 0.22)",
      },
    },
  },
  plugins: [plugin(({ addBase }) => addBase(themeBase))],
};

export default config;
