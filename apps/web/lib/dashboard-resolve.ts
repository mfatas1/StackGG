import "server-only";
import { DashboardConfigSchema, type CrewRow, type DashboardConfig, type DashboardPanel } from "@crewstats/shared";
import { DEFAULT_LAYOUT, PANEL_META, KNOWN_PANEL_IDS, hiddenPanel } from "./dashboard";
import { getUserDashboardConfig } from "./crews";

/**
 * Server-only config resolvers (docs/dashboard-revamp.md). Kept apart from lib/dashboard.ts
 * because they pull DashboardConfigSchema from the @crewstats/shared barrel, which drags in
 * `pg` — fine on the server, fatal in a client bundle.
 *
 * Resolve a stored (possibly null / stale / hand-edited) config into a complete, render-order
 * panel list. Defensive: drops unknown ids, backfills any registry panel the saved config is
 * missing (hidden), and falls back to DEFAULT_LAYOUT when there's nothing valid to read.
 */
export function resolvePanels(saved: unknown): DashboardPanel[] {
  const parsed = DashboardConfigSchema.safeParse(saved);
  const base = parsed.success ? parsed.data.panels.filter((p) => KNOWN_PANEL_IDS.has(p.id)) : DEFAULT_LAYOUT.panels;

  const seen = new Set(base.map((p) => p.id));
  const out: DashboardPanel[] = base.map((p) => ({ ...p }));
  for (const meta of PANEL_META) {
    if (!seen.has(meta.id)) out.push(hiddenPanel(meta.id));
  }
  return out;
}

/** Resolve the full config (preset marker + panels) for the editor. */
export function resolveConfig(saved: unknown): DashboardConfig {
  const parsed = DashboardConfigSchema.safeParse(saved);
  return {
    version: 1,
    preset: parsed.success ? parsed.data.preset : "balanced",
    panels: resolvePanels(saved),
  };
}

/**
 * Resolve the layout for a specific viewer (docs/competitive-casual-revamp.md):
 *  - owner (or signed out, or non-owner without a personal row) → the public layout (crews.dashboard_config)
 *  - non-owner member with a personal override → their own layout
 * Returns the fully-resolved config (preset + backfilled panels).
 */
export async function resolveConfigForViewer(crew: CrewRow, viewerUserId: string | null): Promise<DashboardConfig> {
  let raw: unknown = crew.dashboard_config;
  if (viewerUserId && viewerUserId !== crew.owner_user_id) {
    const personal = await getUserDashboardConfig(crew.id, viewerUserId);
    if (personal) raw = personal;
  }
  return resolveConfig(raw);
}
