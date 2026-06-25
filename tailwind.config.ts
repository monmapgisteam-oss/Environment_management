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
        background: "#F1F5F9",
        text: "#0F172A",
        primary: "#2563EB",
        navy: "#08264A",
        "color-bg": "#F1F5F9",
        "color-card": "#FFFFFF",
        "color-primary": "#2563EB",
        "color-primary-dark": "#0F3F9E",
        "color-text-main": "#08264A",
        "color-text-muted": "#64748B",
        "color-border": "#D9E8F8",
        "color-input-bg": "#FFFFFF",
        "color-soft-blue": "#F3F9FF",
        "color-danger": "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 50px rgba(15, 63, 158, 0.08)",
        input: "0 0 0 4px rgba(37, 99, 235, 0.08)",
        btn: "0 8px 18px rgba(37, 99, 235, 0.25)",
      },
      borderRadius: {
        card: "28px",
        section: "20px",
        input: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
