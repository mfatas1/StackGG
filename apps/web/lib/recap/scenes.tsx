import type { ComponentType } from "react";
import type { Recap, RecapWindow } from "./types";
import { Cover, Grind, Calendar, GreyScreen, Marathon } from "@/components/recap/scenes/act1";
import { RosterIntro, RosterChunk } from "@/components/recap/scenes/act2";
import { WallOfShame, PingStorm, PingReport, TheThrow, WhiteFlag } from "@/components/recap/scenes/act3";
import { PlayerOfSeason, RecordBook, Pentakills, Outnumbered, Flawless, ButtonMasher, Duos, ChampPool } from "@/components/recap/scenes/act4";
import { Identity, Finale } from "@/components/recap/scenes/act5";
import { QuietWeek } from "@/components/recap/scenes/empty";

export interface SceneDef {
  id: string;
  act: string;
  Component: ComponentType<{ recap: Recap }>;
}

interface BaseScene {
  id: string;
  act: string;
  windows: RecapWindow[];
  enabled: (r: Recap) => boolean;
  Component: ComponentType<{ recap: Recap }>;
}

const ROSTER_PER_SCENE = 2;
const both: RecapWindow[] = ["season", "week"];

const ACT1 = "Act I · The Damage";
const ACT2 = "Act II · The Cast";
const ACT3 = "Act III · The Crimes";
const ACT4 = "Act IV · The Glory";
const ACT5 = "Act V · Curtain Call";

// Scenes before the roster, the roster (expanded), then scenes after. The roster is injected at
// its position so the act flows correctly.
const BEFORE_ROSTER: BaseScene[] = [
  { id: "cover", act: ACT1, windows: both, enabled: () => true, Component: Cover },
  { id: "grind", act: ACT1, windows: both, enabled: (r) => r.grind.stackGames > 0, Component: Grind },
  { id: "calendar", act: ACT1, windows: ["season"], enabled: (r) => r.calendar.days.length > 3, Component: Calendar },
  { id: "grey", act: ACT1, windows: both, enabled: (r) => !!r.greyScreen, Component: GreyScreen },
  { id: "marathon", act: ACT1, windows: ["season"], enabled: (r) => !!r.marathon, Component: Marathon },
  { id: "roster-intro", act: ACT2, windows: both, enabled: (r) => r.roster.length > 0, Component: RosterIntro },
];

const AFTER_ROSTER: BaseScene[] = [
  { id: "shame", act: ACT3, windows: both, enabled: (r) => r.shame.length > 0, Component: WallOfShame },
  { id: "ping-storm", act: ACT3, windows: both, enabled: (r) => !!r.pings && r.pings.total > 0, Component: PingStorm },
  { id: "ping-report", act: ACT3, windows: both, enabled: (r) => !!r.pings && r.pings.byType.length > 0, Component: PingReport },
  { id: "throw", act: ACT3, windows: both, enabled: (r) => !!r.throwGame, Component: TheThrow },
  { id: "white-flag", act: ACT3, windows: ["season"], enabled: (r) => !!r.surrenders, Component: WhiteFlag },
  { id: "mvp", act: ACT4, windows: both, enabled: (r) => !!r.mvp, Component: PlayerOfSeason },
  { id: "records", act: ACT4, windows: both, enabled: (r) => r.records.length > 0, Component: RecordBook },
  { id: "penta", act: ACT4, windows: ["season"], enabled: (r) => !!r.pentakills, Component: Pentakills },
  { id: "outnumbered", act: ACT4, windows: ["season"], enabled: (r) => !!r.outnumbered, Component: Outnumbered },
  { id: "flawless", act: ACT4, windows: ["season"], enabled: (r) => !!r.flawless, Component: Flawless },
  { id: "apm", act: ACT4, windows: ["season"], enabled: (r) => !!r.apm, Component: ButtonMasher },
  { id: "duos", act: ACT4, windows: both, enabled: (r) => !!(r.duo.deadliest || r.duo.bff || r.duo.hero), Component: Duos },
  { id: "champ-pool", act: ACT4, windows: ["season"], enabled: (r) => r.champPool.cloud.length > 0, Component: ChampPool },
  { id: "identity", act: ACT5, windows: both, enabled: () => true, Component: Identity },
  { id: "finale", act: ACT5, windows: both, enabled: () => true, Component: Finale },
];

/** The ordered, window-filtered, data-gated scene list for a recap. */
export function getVisibleScenes(recap: Recap): SceneDef[] {
  if (!recap.meta.hasData) {
    return [{ id: "empty", act: "", Component: QuietWeek }];
  }
  const win = recap.meta.window;
  const keep = (s: BaseScene) => s.windows.includes(win) && s.enabled(recap);

  const scenes: SceneDef[] = BEFORE_ROSTER.filter(keep).map(({ id, act, Component }) => ({ id, act, Component }));

  // roster expansion — one scene per pair so each archetype lands
  if (recap.roster.length) {
    for (let start = 0; start < recap.roster.length; start += ROSTER_PER_SCENE) {
      scenes.push({
        id: `roster-${start}`,
        act: ACT2,
        Component: ({ recap: r }) => <RosterChunk recap={r} start={start} count={ROSTER_PER_SCENE} />,
      });
    }
  }

  scenes.push(...AFTER_ROSTER.filter(keep).map(({ id, act, Component }) => ({ id, act, Component })));
  return scenes;
}
