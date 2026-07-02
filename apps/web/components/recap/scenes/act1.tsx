"use client";
import type { Recap } from "@/lib/recap/types";
import { CountUp } from "@/components/kit/motion";
import {
  SceneFrame,
  Stage,
  GhostText,
  SplashEdge,
  VerticalLabel,
  Rise,
  Eyebrow,
  Emote,
  TombstoneRow,
  CalendarHeatmap,
  BigStat,
  Expandable,
  StatTable,
} from "../kit";
import { Lead, Framing, Hot, windowWord } from "./_shared";

const ACT = "Act I · The Damage";

/** COVER — full-bleed splash on the right, the stack name bled off the bottom-left. */
export function Cover({ recap }: { recap: Recap }) {
  const champ = recap.meta.topChampions[0] ?? "";
  return (
    <Stage>
      <SplashEdge champion={champ} side="right" widthPct={66} />
      <VerticalLabel className="absolute left-5 top-1/2 hidden -translate-y-1/2 sm:block">
        {recap.meta.windowLabel} · Recap
      </VerticalLabel>
      <div className="absolute inset-x-[7vw] bottom-[12vh] flex flex-col gap-3 sm:right-[36vw]">
        <Rise>
          <Eyebrow>{recap.meta.seasonLabel} · the whole story</Eyebrow>
        </Rise>
        <Rise delay={0.1}>
          <h1
            className="font-display font-extrabold uppercase leading-[0.84] tracking-tight text-ink"
            style={{ fontSize: "clamp(3.5rem, 13vw, 11rem)", marginLeft: "-0.05em" }}
          >
            {recap.meta.stackName}
          </h1>
        </Rise>
        <Rise delay={0.25}>
          <p className="max-w-md text-lg text-ink-dim">
            {recap.meta.memberCount} players. One {windowWord(recap.meta.window)}. Every crime documented.
          </p>
        </Rise>
      </div>
      <Rise delay={0.5} className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-ink-faint">
        <span className="text-2xs uppercase tracking-[0.3em]">Scroll to begin</span>
        <span className="animate-bounce text-xl">⌄</span>
      </Rise>
    </Stage>
  );
}

/** THE GRIND — giant ghost number, headline anchored left, receipts lower-left, a callout top-right. */
export function Grind({ recap }: { recap: Recap }) {
  const g = recap.grind;
  const noLife = g.perMember.entries[0];
  return (
    <Stage>
      <GhostText className="bottom-[-10vh] right-[-6vw]" opacity={0.05}>
        {g.stackGames.toLocaleString()}
      </GhostText>
      {/* headline column, left, upper third */}
      <div className="absolute left-[7vw] top-[15vh] max-w-xl">
        <Rise>
          <Eyebrow>{ACT}</Eyebrow>
        </Rise>
        <Rise delay={0.1}>
          <p className="mt-5 text-sm uppercase tracking-[0.3em] text-ink-faint">You queued up together</p>
        </Rise>
        <Rise delay={0.15}>
          <div className="font-display font-extrabold leading-[0.85] text-gold" style={{ fontSize: "clamp(4.5rem, 13vw, 10rem)" }}>
            <CountUp value={g.stackGames} duration={1100} />
          </div>
        </Rise>
        <Rise delay={0.25}>
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-ink">games this {windowWord(recap.meta.window)}</p>
        </Rise>
        <Rise delay={0.35}>
          <p className="mt-4 max-w-md text-base text-ink-dim sm:text-lg">
            That&apos;s <Hot>{Math.round(g.hours).toLocaleString()} hours</Hot> of your lives, gone to the Rift. No refunds.
          </p>
        </Rise>
      </div>

      {/* comparison "receipts", scattered lower-left */}
      <div className="absolute bottom-[9vh] left-[7vw] flex flex-col gap-1.5">
        {g.comparisons.map((c, i) => (
          <Rise key={i} delay={0.45 + i * 0.1}>
            <p className="text-sm text-ink-dim">
              <span className="mr-2 font-display text-2xl font-extrabold text-ink">{c.label}</span>
              {c.detail}
            </p>
          </Rise>
        ))}
      </div>

      {/* who-could-not-log-off callout, top-right */}
      {noLife && (
        <div className="absolute right-[7vw] top-[20vh] hidden max-w-xs text-right lg:block">
          <Rise delay={0.55}>
            <p className="text-2xs uppercase tracking-[0.3em] text-ink-faint">could not log off</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-ink">{noLife.name}</p>
            <p className="text-sm text-ink-dim">{noLife.display} — more than anyone in the stack</p>
          </Rise>
        </div>
      )}

      <div className="absolute inset-x-[7vw] bottom-5 lg:left-auto lg:right-[7vw] lg:w-[38vw]">
        <Rise delay={0.6}>
          <Expandable label="Full per-player breakdown">
            <StatTable table={g.table} />
          </Expandable>
        </Rise>
      </div>
    </Stage>
  );
}

export function Calendar({ recap }: { recap: Recap }) {
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing
        title={
          <>
            You played on <Hot>{recap.calendar.nights}</Hot> different days.
          </>
        }
        lead="Every lit square is a night on the Rift. The brighter it burns, the harder you queued."
      />
      <Rise delay={0.2} className="mt-8 w-full">
        <div className="flex justify-center">
          <CalendarHeatmap days={recap.calendar.days} peak={recap.calendar.peak} />
        </div>
      </Rise>
    </SceneFrame>
  );
}

/** THE GREY SCREEN — moody. Ghost "R.I.P", headline top-left, a graveyard grounded along the bottom. */
export function GreyScreen({ recap }: { recap: Recap }) {
  if (!recap.greyScreen) return null;
  const g = recap.greyScreen;
  return (
    <Stage className="bg-gradient-to-b from-transparent to-loss/[0.06]">
      <GhostText className="left-[2vw] top-[-6vh] text-loss" opacity={0.05} size="clamp(10rem, 30vw, 30rem)">
        R.I.P
      </GhostText>
      <div className="absolute left-[7vw] top-[14vh] max-w-xl">
        <Rise>
          <Eyebrow>{ACT}</Eyebrow>
        </Rise>
        <Rise delay={0.1}>
          <p className="mt-5 text-sm uppercase tracking-[0.3em] text-ink-faint">And collectively, you spent</p>
        </Rise>
        <Rise delay={0.15}>
          <div className="flex items-end gap-2">
            <BigStat value={Math.round(g.totalHours)} className="text-loss" />
            <span className="mb-3 font-display text-3xl font-bold text-loss/70">hrs</span>
          </div>
        </Rise>
        <Rise delay={0.25}>
          <p className="font-display text-2xl font-bold uppercase text-ink">staring at the grey screen</p>
        </Rise>
        <Rise delay={0.35}>
          <p className="mt-3 flex items-center gap-2 text-base text-ink-dim">
            Dead. Just… waiting for the timer. <Emote name="sad" size={26} />
          </p>
        </Rise>
        <Rise delay={0.5} className="mt-5">
          <Expandable label="Full death breakdown">
            <StatTable table={g.table} />
          </Expandable>
        </Rise>
      </div>

      {/* graveyard along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-6">
        <p className="text-2xs uppercase tracking-[0.3em] text-ink-faint">{g.ranking.title}</p>
        <TombstoneRow data={g.ranking} max={7} />
      </div>
    </Stage>
  );
}

export function Marathon({ recap }: { recap: Recap }) {
  if (!recap.marathon) return null;
  const m = recap.marathon;
  const mins = Math.floor(m.durationSec / 60);
  const secs = m.durationSec % 60;
  return (
    <Stage>
      <GhostText className="right-[3vw] top-[8vh]" opacity={0.045} size="clamp(9rem, 26vw, 26rem)">
        {mins}:{String(secs).padStart(2, "0")}
      </GhostText>
      <div className="absolute inset-x-[7vw] top-1/2 max-w-2xl -translate-y-1/2">
        <Rise>
          <Eyebrow>{ACT}</Eyebrow>
        </Rise>
        <Rise delay={0.1}>
          <h2 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] text-ink sm:text-6xl">The one that would not end.</h2>
        </Rise>
        <Rise delay={0.25}>
          <Lead className="mt-4">
            Your longest game dragged on for <Hot>{mins} minutes</Hot> before someone finally,
            mercifully {m.surrender ? "typed /ff" : "ended it"}.
          </Lead>
        </Rise>
        <Rise delay={0.4} className="mt-6 max-w-lg">
          <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full rounded-pill bg-gradient-to-r from-primary to-gold" />
          </div>
          <span className="mt-2 block text-2xs uppercase tracking-widest text-ink-faint">
            {m.surrender ? "ended in surrender" : "played to the bitter end"}
          </span>
        </Rise>
      </div>
    </Stage>
  );
}
