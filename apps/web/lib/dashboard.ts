import type {
  PanelId,
  PanelWidth,
  DashboardPanel,
  DashboardPreset,
  DashboardConfig,
} from "@crewstats/shared";

/**
 * Dashboard layout metadata + presets (docs/dashboard-revamp.md). Plain data — no React,
 * and ONLY `import type` from @crewstats/shared so the client editor can import this without
 * dragging the server-only `pg` barrel into the browser bundle. The schema-validating
 * resolvers live in dashboard-resolve.ts (server only); the JSX renderers live in
 * components/board/registry.tsx.
 */

export interface PanelMeta {
  id: PanelId;
  /** Shown in the editor list. */
  title: string;
  blurb: string;
  category: "core" | "competitive" | "fun";
  /** Widths the panel supports; the first is its default. A single entry locks the width. */
  allowedWidths: PanelWidth[];
}

const FULL: PanelWidth[] = ["full"];
const HALF_OR_FULL: PanelWidth[] = ["half", "full"];

/** Ordered registry of every panel. Order = canonical default order. */
export const PANEL_META: PanelMeta[] = [
  { id: "stat-rail", title: "Stat rail", blurb: "Headline numbers: 5-stack winrate, best duo, weekly games, top climber.", category: "core", allowedWidths: FULL },
  { id: "leaderboard", title: "Leaderboard", blurb: "Cross-mode ranked ladder for the whole stack.", category: "competitive", allowedWidths: FULL },
  { id: "synergy", title: "Synergy explorer", blurb: "Who plays well together — pairs, trios and the full 5-stack.", category: "competitive", allowedWidths: FULL },
  { id: "role-matrix", title: "Where everyone plays", blurb: "Each player's lane spread and most-played champ per lane.", category: "competitive", allowedWidths: HALF_OR_FULL },
  { id: "records", title: "Records", blurb: "Group awards — biggest games, KDA, damage and more.", category: "fun", allowedWidths: HALF_OR_FULL },
  { id: "lane-leaders", title: "Best in each lane", blurb: "The reigning #1 player in every role, with runners-up.", category: "fun", allowedWidths: FULL },
  { id: "tags", title: "Player tags", blurb: "Porofessor-style playstyle tags for each member.", category: "fun", allowedWidths: HALF_OR_FULL },
  { id: "recent-games", title: "Recent shared games", blurb: "The stack's latest games together.", category: "core", allowedWidths: FULL },
  // v2 purpose-built panels
  { id: "team-performance", title: "Team performance", blurb: "How you do together: winrate as a 5 vs duoq, blended rank, strongest lineups.", category: "competitive", allowedWidths: HALF_OR_FULL },
  { id: "sessions", title: "Sessions", blurb: "Your nights, game-grouped: 'last night: 5-stack, 4W–3L, Mateo carried.'", category: "fun", allowedWidths: HALF_OR_FULL },
];

const META_BY_ID = new Map(PANEL_META.map((m) => [m.id, m]));
export const getPanelMeta = (id: PanelId): PanelMeta | undefined => META_BY_ID.get(id);

const panel = (id: PanelId, visible: boolean, width: PanelWidth = META_BY_ID.get(id)!.allowedWidths[0]): DashboardPanel => ({
  id,
  visible,
  width,
});

/**
 * The default layout = today's hardcoded dashboard, exactly. Used when a stack has no saved
 * config so existing pages are unchanged. `tags` is hidden by default (it lived only as a
 * leaderboard hover until now).
 */
export const DEFAULT_LAYOUT: DashboardConfig = {
  version: 1,
  preset: "balanced",
  panels: [
    panel("stat-rail", true),
    panel("leaderboard", true),
    panel("synergy", true),
    panel("role-matrix", true, "half"),
    panel("records", true, "half"),
    panel("lane-leaders", true),
    panel("tags", false),
    panel("recent-games", true),
    // v2 panels are available but hidden by default, so today's dashboard is unchanged.
    panel("team-performance", false, "half"),
    panel("sessions", false, "half"),
  ],
};

/** One-click starting points. Each lists every panel so the resolver has nothing to append. */
export const PRESETS: Record<Exclude<DashboardPreset, "custom">, DashboardPanel[]> = {
  balanced: DEFAULT_LAYOUT.panels,
  // How you do together up top, then the ladder and roles.
  competitive: [
    panel("team-performance", true, "full"),
    panel("leaderboard", true),
    panel("synergy", true),
    panel("role-matrix", true, "full"),
    panel("sessions", true, "half"),
    panel("recent-games", true, "half"),
    panel("stat-rail", false),
    panel("records", false, "half"),
    panel("lane-leaders", false),
    panel("tags", false),
  ],
  // Drama, memory and bragging rights: the sessions to relive, the records to argue over.
  casual: [
    panel("sessions", true, "full"),
    panel("records", true, "half"),
    panel("tags", true, "half"),
    panel("lane-leaders", true),
    panel("recent-games", true),
    panel("stat-rail", false),
    panel("leaderboard", false),
    panel("synergy", false),
    panel("role-matrix", false, "half"),
    panel("team-performance", false, "half"),
  ],
};

export const PRESET_LABELS: Record<DashboardPreset, { label: string; blurb: string }> = {
  balanced: { label: "Balanced", blurb: "A bit of everything — the full StackGG dashboard." },
  competitive: { label: "Competitive", blurb: "Ladder, roles and synergy up top. For the tryhards." },
  casual: { label: "Casual", blurb: "Records, tags and lane bragging rights. For the memes." },
  custom: { label: "Custom", blurb: "Your own hand-tuned layout." },
};

/** Apply a named preset, returning a complete, render-order panel list. */
export function applyPreset(preset: Exclude<DashboardPreset, "custom">): DashboardPanel[] {
  return PRESETS[preset].map((p) => ({ ...p }));
}

/** Known panel ids, in canonical order. Derived from PANEL_META (the single source). */
export const KNOWN_PANEL_IDS = new Set<PanelId>(PANEL_META.map((m) => m.id));

/** Build a hidden, default-width panel entry for an id the resolver needs to backfill. */
export const hiddenPanel = (id: PanelId): DashboardPanel => panel(id, false);
