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
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          low: "#eff4ff",
          lowest: "#ffffff",
          container: "#e5eeff",
          high: "#dce9ff",
          highest: "#d3e4fe",
        },
        "on-surface": {
          DEFAULT: "#0b1c30",
          variant: "#45464d",
        },
        outline: {
          DEFAULT: "#76777d",
          variant: "#c6c6cd",
        },
        primary: {
          DEFAULT: "#0b1c30",
          container: "#131b2e",
          "fixed-dim": "#bec6e0",
          "fixed": "#dae2fd",
        },
        secondary: {
          DEFAULT: "#006c49",
          container: "#6cf8bb",
          "container-text": "#00714d",
          light: "#4edea3",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "container-text": "#93000a",
          highlight: "#f23d5c",
        },
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        "diffused-sm": "0 1px 4px rgba(15, 23, 42, 0.04)",
        "diffused-md": "0 4px 16px rgba(15, 23, 42, 0.04)",
        "diffused-lg": "0 8px 30px rgba(15, 23, 42, 0.045)",
        "violation-glow": "0 8px 30px rgba(239, 68, 68, 0.12)",
        "emerald-glow": "0 4px 20px rgba(0, 108, 73, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
