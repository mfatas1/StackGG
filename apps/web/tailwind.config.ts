import type { Config } from "tailwindcss";

/**
 * StackGG — warm-dark Hextech (coral + gold on warm charcoal).
 *
 * Per FRONTEND_PLAN §3 + DESIGN.md color palette: the identity is a warm-charcoal
 * surface ramp, a CORAL primary (hue 45), and GOLD for rank / #1. The only cool
 * color is atmospheric fog at depth (3D stage only) — never UI. Tokens are OKLCH
 * components stored as CSS custom properties so `bg-primary/10` opacity works and
 * the whole app reskins from `globals.css`.
 */

const c = (v: string) => `oklch(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("--bg"),
        surface: {
          DEFAULT: c("--surface"),
          2: c("--surface-2"),
          3: c("--surface-3"),
        },
        line: {
          DEFAULT: c("--line"),
          strong: c("--line-strong"),
        },
        ink: {
          DEFAULT: c("--ink"),
          dim: c("--ink-dim"),
          faint: c("--ink-faint"),
        },
        // Brand / action = coral
        primary: {
          DEFAULT: c("--primary"),
          strong: c("--primary-strong"),
          on: c("--primary-on"),
        },
        // Rank tiers / #1 highlight
        gold: {
          DEFAULT: c("--gold"),
          light: c("--gold-light"),
          dark: c("--gold-dark"),
        },
        win: c("--win"),
        loss: c("--loss"),
        info: c("--info"),
        elite: c("--elite"), // "top tier" stat highlight — a bright blue, distinct from win/green
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.75rem", { lineHeight: "1rem" }],
        xs: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.6rem" }],
        "2xl": ["1.5rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.15rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.4rem" }],
        "5xl": ["3rem", { lineHeight: "1.05" }],
        hero: ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "12px",
        lg: "16px",
        pill: "999px",
      },
      boxShadow: {
        pop: "0 12px 32px oklch(0 0 0 / 0.45)",
        glow: "0 0 0 1px oklch(var(--primary) / 0.45), 0 8px 30px oklch(var(--primary) / 0.20)",
        "glow-gold": "0 0 0 1px oklch(var(--gold) / 0.40), 0 8px 30px oklch(var(--gold) / 0.18)",
        rim: "inset 0 1px 0 oklch(var(--ink) / 0.06)",
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
        "ring-ignite": {
          "0%": { opacity: "0", transform: "scale(0.6) rotate(-25deg)" },
          "55%": { opacity: "1" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "ring-ignite": "ring-ignite 0.8s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
