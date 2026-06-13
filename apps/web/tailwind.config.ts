import type { Config } from "tailwindcss";

/**
 * StackGG — Hextech theme (League client visual language). Obsidian-navy base,
 * Hextech gold as the brand/action color, Hextech teal as accent + victory,
 * red for defeat. Fixed dark theme. Hex values track the League client palette.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#010A13", // obsidian
        surface: {
          DEFAULT: "#0A1622", // panel base
          2: "#0F1F30", // raised panel
          3: "#16293E", // hover / selected
        },
        line: {
          DEFAULT: "#1E3247", // navy hairline
          strong: "#3C5A73",
        },
        ink: {
          DEFAULT: "#F0E6D2", // hextech parchment
          dim: "#A09B8C", // muted grey-gold
          faint: "#7A8A99", // navy-grey meta
        },
        // Brand / action = Hextech gold
        primary: {
          DEFAULT: "#C89B3C", // hextech gold
          strong: "#E3BD6A", // brighter gold for hover/active
          on: "#06101C", // near-black text on gold
        },
        gold: {
          DEFAULT: "#C89B3C",
          light: "#F0D9A0",
          dark: "#785A28",
        },
        // Hextech teal accent + victory
        hex: {
          DEFAULT: "#0AC8B9",
          dim: "#0397AB",
          deep: "#005A82",
        },
        win: "#0AC8B9", // League marks victory in teal/blue
        loss: "#E84057", // defeat red
        info: "#0397AB",
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
        "2xl": ["1.5rem", { lineHeight: "1.7rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.1rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.4rem" }],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        lg: "6px",
        pill: "999px",
      },
      boxShadow: {
        pop: "0 14px 40px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(200,155,60,0.5), 0 6px 24px rgba(200,155,60,0.18)",
        "glow-hex": "0 0 0 1px rgba(10,200,185,0.45), 0 6px 24px rgba(10,200,185,0.16)",
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
        shimmer: { "100%": { transform: "translateX(100%)" } },
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
