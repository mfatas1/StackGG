import Link from "next/link";
import type { ReactNode } from "react";
import type { CrewDashboard, PanelId, Award } from "@crewstats/shared";
import type { CrewRoleSpread, PlayerTag, CrewSession } from "@crewstats/stats";
import { Frame, Section, PanelHead } from "@/components/kit/Frame";
import { StatRail } from "./StatRail";
import { SynergyExplorer } from "./SynergyExplorer";
import { Awards } from "./Awards";
import { RoleMatrix } from "./RoleMatrix";
import { LaneLeaders } from "./LaneLeaders";
import { TagsPanel } from "./TagsPanel";
import { TeamPerformance } from "./TeamPerformance";
import { Sessions } from "./Sessions";
import { QueueTabsClient, LadderForQueue, ActivityForQueue, type QueueBoards } from "./QueueBoard";

/**
 * Render registry (docs/dashboard-revamp.md). One entry per panel id; each returns the
 * panel's full chrome (Section / Frame / PanelHead) so the page just lays the results out
 * in a grid. Markup mirrors the previous hardcoded dashboard exactly, so the default layout
 * is pixel-identical. Layout metadata (titles, widths, order, presets) lives in lib/dashboard.ts.
 */
export interface PanelContext {
  d: CrewDashboard;
  awards: Award[];
  roleMatrix: CrewRoleSpread[];
  tags: Record<string, PlayerTag[]>;
  sessions: CrewSession[];
  boards: QueueBoards;
  crewSlug: string;
  basePath: string;
}

export const PANEL_RENDERERS: Record<PanelId, (ctx: PanelContext) => ReactNode> = {
  "stat-rail": ({ d, crewSlug }) => <StatRail d={d} crewSlug={crewSlug} />,

  leaderboard: ({ boards, crewSlug, tags }) => (
    <Section title="Leaderboard" action={<QueueTabsClient />}>
      <Frame>
        <div className="p-3">
          <LadderForQueue boards={boards} crewSlug={crewSlug} tags={tags} />
        </div>
      </Frame>
    </Section>
  ),

  synergy: ({ d, crewSlug }) => (
    <Section title="Who plays well together">
      <SynergyExplorer members={d.members} lineups={d.lineups} minGames={d.minSynergyGames} crewSlug={crewSlug} />
    </Section>
  ),

  "role-matrix": ({ roleMatrix, crewSlug }) => (
    <Frame>
      <div className="flex h-full flex-col">
        <PanelHead title="Where everyone plays" />
        <div className="flex flex-1 flex-col p-4 pt-3">
          <RoleMatrix rows={roleMatrix} crewSlug={crewSlug} fill />
        </div>
      </div>
    </Frame>
  ),

  records: ({ awards, crewSlug, basePath }) => (
    <Frame>
      <PanelHead
        title="Records"
        action={
          awards.length > 0 ? (
            <Link href={`${basePath}/records`} className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-gold">
              View all →
            </Link>
          ) : undefined
        }
      />
      <div className="p-4 pt-3">
        <Awards awards={awards} crewSlug={crewSlug} limit={6} />
      </div>
    </Frame>
  ),

  "lane-leaders": ({ roleMatrix, crewSlug }) => (
    <Frame>
      <PanelHead title="Best in each lane" />
      <div className="p-4 pt-4">
        <LaneLeaders rows={roleMatrix} crewSlug={crewSlug} />
      </div>
    </Frame>
  ),

  tags: ({ d, tags, crewSlug }) => (
    <Frame>
      <div className="flex h-full flex-col">
        <PanelHead title="Player tags" />
        <div className="flex flex-1 flex-col p-4 pt-3">
          <TagsPanel members={d.members} tags={tags} crewSlug={crewSlug} />
        </div>
      </div>
    </Frame>
  ),

  "recent-games": ({ boards, crewSlug }) => (
    <Section title="Recent shared games">
      <ActivityForQueue boards={boards} crewSlug={crewSlug} />
    </Section>
  ),

  "team-performance": ({ d, boards, crewSlug }) => (
    <Frame>
      <div className="flex h-full flex-col">
        <PanelHead title="How we do together" />
        <div className="flex flex-1 flex-col p-4 pt-3">
          <TeamPerformance lineups={d.lineups} entries={boards.all.leaderboard} members={d.members} minGames={d.minSynergyGames} crewSlug={crewSlug} />
        </div>
      </div>
    </Frame>
  ),

  sessions: ({ d, sessions }) => (
    <Frame>
      <div className="flex h-full flex-col">
        <PanelHead title="Sessions" />
        <div className="flex flex-1 flex-col p-4 pt-3">
          <Sessions sessions={sessions} members={d.members} />
        </div>
      </div>
    </Frame>
  ),
};
