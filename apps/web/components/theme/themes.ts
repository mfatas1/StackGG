/**
 * Theme catalogue. The UI recolours purely from CSS token blocks in globals.css
 * (keyed by [data-theme]); this module names the themes and carries the matching
 * 3D Rift scene palette (the canvas can't read CSS vars cheaply, so its colours
 * live here). Keep the ids in sync with the [data-theme="…"] blocks.
 */

export interface RiftPalette {
  daylight?: boolean;
  // scene
  clear: string;
  fog: string;
  // lights
  ambient: string;
  key: string;
  sideA: string; // blue side
  sideB: string; // red side
  mote: string;
  // painted terrain
  jungleBase: number;
  jungleRange: number;
  jungleMult: [number, number, number];
  lane: string;
  laneGlow: string;
  laneGlowShadow: string;
  river: string;
  riverGlow: string;
  riverGlowShadow: string;
  baseA: string;
  baseAInner: string;
  baseAMid: string;
  baseB: string;
  baseBInner: string;
  baseBMid: string;
  camp: string;
  vignette: string;
}

export interface ThemeDef {
  id: string;
  label: string;
  light?: boolean;
  swatch: string; // hex for the switcher dot (the primary)
}

export const THEMES: ThemeDef[] = [
  { id: "frost", label: "Frost", swatch: "#4cc6e8" },
  { id: "arcane", label: "Arcane", swatch: "#a371e8" },
  { id: "ember", label: "Ember", swatch: "#ec6a3c" },
  { id: "verdant", label: "Verdant", swatch: "#2fb486" },
  { id: "hextech", label: "Hextech", swatch: "#c89b3c" },
  { id: "parchment", label: "Daylight", light: true, swatch: "#1f7a86" },
];

export const DEFAULT_THEME = "parchment";

// Shared dark Summoner's Rift base (green jungle, blue river, blue/red sides).
const srBase = {
  jungleBase: 22,
  jungleRange: 22,
  jungleMult: [0.62, 1.28, 0.72] as [number, number, number],
  lane: "rgba(150, 124, 72, 0.55)",
  river: "rgba(30, 86, 140, 0.92)",
  riverGlow: "rgba(46, 120, 200, 0.7)",
  riverGlowShadow: "rgba(40, 130, 210, 0.8)",
  baseA: "rgba(34, 96, 150, 0.9)",
  baseAInner: "rgba(150, 215, 255, 1)",
  baseAMid: "rgba(60, 150, 240, 0.7)",
  baseB: "rgba(150, 50, 50, 0.9)",
  baseBInner: "rgba(255, 170, 150, 1)",
  baseBMid: "rgba(230, 70, 60, 0.7)",
  vignette: "rgba(3, 7, 14, 0.85)",
  sideA: "#4a92e0",
  sideB: "#e0584a",
};

export const RIFT_PALETTES: Record<string, RiftPalette> = {
  frost: {
    ...srBase,
    clear: "#04080f",
    fog: "#06121f",
    ambient: "#37506e",
    key: "#bcd8ee",
    mote: "#9fd8ec",
    laneGlow: "rgba(130, 205, 235, 0.95)",
    laneGlowShadow: "rgba(90, 180, 225, 0.9)",
    camp: "rgba(130, 200, 230, 0.85)",
  },
  arcane: {
    ...srBase,
    clear: "#09071a",
    fog: "#0d0a24",
    ambient: "#473a6e",
    key: "#d6c6f2",
    mote: "#c9a6f0",
    laneGlow: "rgba(185, 135, 240, 0.95)",
    laneGlowShadow: "rgba(150, 95, 220, 0.9)",
    camp: "rgba(185, 140, 235, 0.85)",
  },
  ember: {
    ...srBase,
    clear: "#0e0a08",
    fog: "#1a1310",
    ambient: "#5a463c",
    key: "#f2cda0",
    mote: "#eaae7a",
    laneGlow: "rgba(238, 150, 90, 0.95)",
    laneGlowShadow: "rgba(220, 110, 60, 0.9)",
    camp: "rgba(235, 160, 95, 0.85)",
  },
  verdant: {
    ...srBase,
    clear: "#05100c",
    fog: "#08191a",
    ambient: "#37604e",
    key: "#bfe8cf",
    mote: "#8fe6b4",
    laneGlow: "rgba(120, 225, 165, 0.95)",
    laneGlowShadow: "rgba(70, 195, 130, 0.9)",
    camp: "rgba(130, 225, 170, 0.85)",
  },
  hextech: {
    ...srBase,
    clear: "#03070e",
    fog: "#06101f",
    ambient: "#3a4a6a",
    key: "#e7c982",
    mote: "#e9c87a",
    laneGlow: "rgba(225, 180, 95, 0.95)",
    laneGlowShadow: "rgba(220, 170, 80, 0.9)",
    camp: "rgba(210, 160, 80, 0.85)",
  },
  // Daylight — a bright, sunlit Summoner's Rift for the light theme.
  parchment: {
    daylight: true,
    clear: "#b4cee2",
    fog: "#a6c0d6",
    ambient: "#bcd2e2",
    key: "#fff3da",
    sideA: "#6fb0e8",
    sideB: "#e88a7a",
    mote: "#fff0c8",
    jungleBase: 58,
    jungleRange: 26,
    jungleMult: [0.72, 1.2, 0.78],
    lane: "rgba(196, 172, 120, 0.7)",
    laneGlow: "rgba(120, 95, 50, 0.5)",
    laneGlowShadow: "rgba(120, 95, 50, 0.3)",
    river: "rgba(86, 150, 200, 0.92)",
    riverGlow: "rgba(120, 180, 225, 0.55)",
    riverGlowShadow: "rgba(120, 180, 225, 0.5)",
    baseA: "rgba(120, 170, 220, 0.85)",
    baseAInner: "rgba(190, 225, 255, 0.9)",
    baseAMid: "rgba(120, 175, 230, 0.6)",
    baseB: "rgba(220, 140, 120, 0.85)",
    baseBInner: "rgba(255, 205, 185, 0.9)",
    baseBMid: "rgba(225, 130, 110, 0.6)",
    camp: "rgba(150, 120, 70, 0.5)",
    vignette: "rgba(190, 210, 228, 0.45)",
  },
};

export function paletteFor(themeId: string): RiftPalette {
  return RIFT_PALETTES[themeId] ?? RIFT_PALETTES[DEFAULT_THEME]!;
}
