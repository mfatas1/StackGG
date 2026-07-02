"use client";
import Link from "next/link";
import Image from "next/image";
import type { Recap } from "@/lib/recap/types";
import { pingIcon } from "@/lib/format";
import { SceneFrame, TribunalCase, Standings, ChatBubbles, IconField, Rise, Stagger, StaggerItem, ChampMug, BigStat, Expandable, StatTable, Emote } from "../kit";
import { Lead, Framing } from "./_shared";

const ACT = "Act III · The Crimes";

export function WallOfShame({ recap }: { recap: Recap }) {
  if (!recap.shame.length) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing
        title={<>The Tribunal <Emote name="angry" size={44} className="ml-1 align-middle" /></>}
        lead="Court is in session. Each case names the stack's worst offender for that charge — the mugshot is just their most-played champ. Some of you are repeat customers."
      />
      <Stagger className="mt-8 grid w-full grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3" amount={0.1}>
        {recap.shame.map((c) => (
          <StaggerItem key={c.caseNo} className="flex justify-center">
            <TribunalCase crime={c} />
          </StaggerItem>
        ))}
      </Stagger>
    </SceneFrame>
  );
}

export function PingStorm({ recap }: { recap: Recap }) {
  if (!recap.pings) return null;
  const p = recap.pings;
  return (
    <SceneFrame variant="panel" act={ACT}>
      <Rise>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-faint">Between you, you fired</p>
          <BigStat value={p.total} className="text-primary" />
          <p className="font-display text-2xl font-bold uppercase text-ink">pings</p>
          <Lead className="text-center">That&apos;s <span className="font-bold text-primary">{p.perGame.toFixed(0)} a game</span>. Allegedly to communicate.</Lead>
        </div>
      </Rise>
      <Rise delay={0.3} className="mt-10 w-full max-w-3xl">
        <p className="mb-6 text-center text-sm uppercase tracking-wide text-ink-faint">{p.perMember.title}</p>
        <ChatBubbles data={p.perMember} max={7} />
      </Rise>
      <Rise delay={0.45} className="mt-6 w-full">
        <Expandable label="Every player's ping habit">
          <StatTable table={p.table} />
        </Expandable>
      </Rise>
    </SceneFrame>
  );
}

export function PingReport({ recap }: { recap: Recap }) {
  if (!recap.pings || !recap.pings.byType.length) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing
        title={<>What were you even saying? <Emote name="question" size={44} className="ml-1 align-middle" /></>}
        lead="Every ping type, what it actually means, and who leans on it hardest (per game)."
      />
      <Stagger className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-2.5" amount={0.15}>
        {recap.pings.byType.map((t) => (
          <StaggerItem key={t.key}>
            <div className="notch-sm flex items-center gap-3 border border-line/70 bg-surface/60 px-3 py-2.5 sm:gap-4 sm:px-4">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2/70">
                <Image src={pingIcon(t.key)} alt={t.label} width={30} height={30} className="object-contain" unoptimized />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold leading-tight text-ink">{t.label}</p>
                <p className="truncate text-xs text-ink-dim">{t.meaning}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ChampMug champion={t.leaderChampion} size={30} tone="neutral" />
                <div className="text-right">
                  <p className="truncate text-xs font-semibold text-ink">{t.leaderName}</p>
                  <p className="tnum text-2xs font-bold text-primary">{t.leaderPerGame.toFixed(1)}/game</p>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </SceneFrame>
  );
}

export function TheThrow({ recap }: { recap: Recap }) {
  if (!recap.throwGame) return null;
  const t = recap.throwGame;
  return (
    <SceneFrame variant="splash" splashChampion={t.champion} act={ACT}>
      <Framing title="The throw of the season." />
      <Rise delay={0.15} className="mt-6 flex flex-col items-center gap-4">
        <div className="notch flex items-center gap-5 border-2 border-loss/60 bg-surface/85 px-7 py-5 backdrop-blur-sm">
          <ChampMug champion={t.champion} size={72} tone="shame" />
          <div className="text-left">
            <p className="font-display text-5xl font-extrabold tabular-nums text-loss">
              {t.kills}/{t.deaths}/{t.assists}
            </p>
            <p className="text-sm text-ink-dim">{t.name} · one game we&apos;ll never forget</p>
          </div>
        </div>
        <Lead className="text-center">{t.line}</Lead>
        <Link href={`/match/${t.matchId}`} className="rounded-pill border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:text-loss">
          View the crime scene →
        </Link>
      </Rise>
    </SceneFrame>
  );
}

export function WhiteFlag({ recap }: { recap: Recap }) {
  if (!recap.surrenders) return null;
  const s = recap.surrenders;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Rise>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-faint">You voted to surrender</p>
          <BigStat value={s.total} className="text-loss" />
          <p className="font-display text-2xl font-bold uppercase text-ink">times this season</p>
          <Lead className="text-center">Hope, as they say, is not a strategy.</Lead>
        </div>
      </Rise>
      <Rise delay={0.2} className="mt-6 flex justify-center">
        <IconField count={s.total} glyph="🏳" tone="loss" cap={120} />
      </Rise>
      <Rise delay={0.3} className="mt-6 w-full max-w-xl">
        <p className="mb-3 text-center text-sm uppercase tracking-wide text-ink-faint">{s.ranking.title}</p>
        <Standings data={s.ranking} maxRows={5} />
      </Rise>
    </SceneFrame>
  );
}
