import type { Config } from "tailwindcss";

/**
 * StackGG design tokens (see DESIGN.md). Warm-dark, playful-precise.
 * Colors are literal OKLCH with the Tailwind `<alpha-value>` placeholder so
 * opacity modifiers (e.g. bg-primary/15) work. Theme is fixed dark — no toggle.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "oklch(0.155 0.010 60 / <alpha-value>)",
        surface: {
          DEFAULT: "oklch(0.200 0.012 60 / <alpha-value>)",
          2: "oklch(0.235 0.014 60 / <alpha-value>)",
          3: "oklch(0.275 0.016 60 / <alpha-value>)",
        },
        line: {
          DEFAULT: "oklch(0.320 0.014 60 / <alpha-value>)",
          strong: "oklch(0.420 0.016 60 / <alpha-value>)",
        },
        ink: {
          DEFAULT: "oklch(0.965 0.008 80 / <alpha-value>)",
          dim: "oklch(0.800 0.012 80 / <alpha-value>)",
          faint: "oklch(0.640 0.012 80 / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(0.730 0.170 45 / <alpha-value>)",
          strong: "oklch(0.665 0.180 42 / <alpha-value>)",
          on: "oklch(0.205 0.030 45 / <alpha-value>)",
        },
        win: "oklch(0.800 0.165 150 / <alpha-value>)",
        loss: "oklch(0.660 0.190 25 / <alpha-value>)",
        gold: "oklch(0.815 0.130 85 / <alpha-value>)",
        info: "oklch(0.720 0.130 280 / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // product fixed rem scale (~1.2 ratio)
        "2xs": ["0.75rem", { lineHeight: "1rem" }],
        xs: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.6rem" }],
        "2xl": ["1.5rem", { lineHeight: "1.7rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.1rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.4rem" }],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        lg: "16px",
        pill: "999px",
      },
      boxShadow: {
        pop: "0 12px 32px oklch(0 0 0 / 0.45)",
        glow: "0 0 0 1px oklch(0.730 0.170 45 / 0.35), 0 8px 28px oklch(0.730 0.170 45 / 0.18)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
