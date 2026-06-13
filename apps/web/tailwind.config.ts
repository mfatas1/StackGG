import type { Config } from "tailwindcss";

// Dark, data-dense gaming theme with one accent color (PLAN §5).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0c10",
          raised: "#12151c",
          card: "#161a23",
          hover: "#1c212c",
        },
        line: "#232936",
        ink: {
          DEFAULT: "#e6e9ef",
          dim: "#9aa3b2",
          faint: "#5b6473",
        },
        accent: {
          DEFAULT: "#3ad1c5", // teal
          dim: "#1f8a82",
          glow: "#3ad1c533",
        },
        win: "#3fbf6f",
        loss: "#e05666",
        gold: "#d9a441",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
