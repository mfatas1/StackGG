// Satori (next/og) can't parse oklch(), so the recap's OG cards resolve the active theme's
// tokens to sRGB hex here. The triples mirror globals.css — keep them in sync if tokens change.

type Triple = [number, number, number]; // L C H

interface ThemeTokens {
  bg: Triple;
  surface: Triple;
  line: Triple;
  ink: Triple;
  inkDim: Triple;
  inkFaint: Triple;
  primary: Triple;
  gold: Triple;
  loss: Triple;
  win: Triple;
}

const THEME_TOKENS: Record<string, ThemeTokens> = {
  frost: {
    bg: [0.15, 0.025, 245], surface: [0.22, 0.035, 240], line: [0.38, 0.05, 235],
    ink: [0.95, 0.01, 230], inkDim: [0.72, 0.015, 235], inkFaint: [0.62, 0.025, 235],
    primary: [0.74, 0.13, 230], gold: [0.86, 0.06, 225], loss: [0.62, 0.19, 18], win: [0.78, 0.13, 175],
  },
  arcane: {
    bg: [0.15, 0.03, 292], surface: [0.22, 0.04, 290], line: [0.38, 0.055, 286],
    ink: [0.95, 0.012, 300], inkDim: [0.72, 0.018, 300], inkFaint: [0.62, 0.03, 290],
    primary: [0.66, 0.19, 300], gold: [0.85, 0.08, 305], loss: [0.62, 0.19, 12], win: [0.78, 0.12, 185],
  },
  ember: {
    bg: [0.15, 0.02, 40], surface: [0.22, 0.025, 40], line: [0.38, 0.04, 35],
    ink: [0.95, 0.012, 70], inkDim: [0.72, 0.016, 70], inkFaint: [0.6, 0.02, 50],
    primary: [0.7, 0.16, 42], gold: [0.82, 0.11, 70], loss: [0.62, 0.2, 25], win: [0.78, 0.14, 165],
  },
  verdant: {
    bg: [0.15, 0.022, 175], surface: [0.22, 0.03, 172], line: [0.38, 0.045, 168],
    ink: [0.95, 0.01, 150], inkDim: [0.72, 0.015, 160], inkFaint: [0.62, 0.025, 175],
    primary: [0.72, 0.14, 165], gold: [0.84, 0.1, 90], loss: [0.62, 0.19, 22], win: [0.72, 0.13, 235],
  },
  hextech: {
    bg: [0.14, 0.022, 250], surface: [0.22, 0.035, 248], line: [0.38, 0.05, 244],
    ink: [0.93, 0.022, 90], inkDim: [0.69, 0.016, 92], inkFaint: [0.64, 0.025, 235],
    primary: [0.71, 0.105, 84], gold: [0.87, 0.075, 90], loss: [0.62, 0.19, 18], win: [0.75, 0.115, 192],
  },
  parchment: {
    bg: [0.95, 0.008, 95], surface: [0.99, 0.004, 95], line: [0.86, 0.012, 95],
    ink: [0.27, 0.03, 235], inkDim: [0.45, 0.03, 230], inkFaint: [0.56, 0.025, 225],
    primary: [0.55, 0.1, 200], gold: [0.62, 0.12, 78], loss: [0.53, 0.2, 25], win: [0.55, 0.15, 155],
  },
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** oklch (L 0..1, C, H degrees) → sRGB hex. */
export function oklchToHex([L, C, H]: Triple): string {
  const hr = (H * Math.PI) / 180;
  const a = Math.cos(hr) * C;
  const b = Math.sin(hr) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (x: number) => clamp01(x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const to255 = (x: number) => Math.round(gamma(x) * 255);
  return "#" + [to255(lr), to255(lg), to255(lb)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export interface ResolvedTheme {
  bg: string;
  surface: string;
  line: string;
  ink: string;
  inkDim: string;
  inkFaint: string;
  primary: string;
  gold: string;
  loss: string;
  win: string;
  light: boolean;
}

/** Resolve a theme id to hex strings for OG rendering. Falls back to Frost. */
export function resolveTheme(themeId: string | null | undefined): ResolvedTheme {
  const t = THEME_TOKENS[themeId ?? "frost"] ?? THEME_TOKENS.frost!;
  return {
    bg: oklchToHex(t.bg),
    surface: oklchToHex(t.surface),
    line: oklchToHex(t.line),
    ink: oklchToHex(t.ink),
    inkDim: oklchToHex(t.inkDim),
    inkFaint: oklchToHex(t.inkFaint),
    primary: oklchToHex(t.primary),
    gold: oklchToHex(t.gold),
    loss: oklchToHex(t.loss),
    win: oklchToHex(t.win),
    light: themeId === "parchment",
  };
}

export function toneHex(tone: "shame" | "flex" | "neutral", t: ResolvedTheme): string {
  return tone === "shame" ? t.loss : tone === "flex" ? t.gold : t.primary;
}
