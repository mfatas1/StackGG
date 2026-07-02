"use client";
import Image from "next/image";
import Link from "next/link";
import type { Recap } from "@/lib/recap/types";
import { champIcon, champName } from "@/lib/format";
import { SceneFrame, MVPSpotlight, PentakillBanner, Standings, MeterBoard, DuoCard, Rise, Stagger, StaggerItem, ChampMug, Emote } from "../kit";
import { Framing, Hot } from "./_shared";

const ACT = "Act IV · The Glory";

export function PlayerOfSeason({ recap }: { recap: Recap }) {
  if (!recap.mvp) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing title={<>Player of the Season <Emote name="gg" size={40} className="ml-1 align-middle" /></>} lead="Highest carry impact in the stack. The one the rest of you were lucky to queue with." />
      <Rise delay={0.2} className="mt-8 flex justify-center">
        <MVPSpotlight mvp={recap.mvp} />
      </Rise>
    </SceneFrame>
  );
}

export function RecordBook({ recap }: { recap: Recap }) {
  if (!recap.records.length) return null;
  return (
    <SceneFrame variant="plain" act="Act IV · The Record Book">
      <Framing title={<>The record book <Emote name="laugh" size={40} className="ml-1 align-middle" /></>} lead="Forget season totals — these are the single games nobody will let you live down." />
      <Stagger className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" amount={0.1}>
        {recap.records.map((r) => (
          <StaggerItem key={r.key} className="h-full">
            <Link href={`/match/${r.matchId}`} className="notch-sm flex h-full flex-col gap-2 border border-line/70 bg-surface/60 p-4 transition-colors hover:border-gold/50">
              <p className="text-2xs uppercase tracking-wide text-ink-faint">{r.title}</p>
              <p className="font-display text-4xl font-extrabold leading-none text-gold">{r.value}</p>
              <div className="flex items-center gap-2">
                <ChampMug champion={r.champion} size={26} tone="flex" />
                <span className="truncate text-sm font-semibold text-ink">{r.holder}</span>
                <span className="tnum ml-auto text-2xs text-ink-faint">{r.kda}</span>
              </div>
              <p className="text-xs leading-snug text-ink-dim">{r.line}</p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </SceneFrame>
  );
}

export function Pentakills({ recap }: { recap: Recap }) {
  if (!recap.pentakills) return null;
  return (
    <SceneFrame variant="panel" act={ACT}>
      <Rise className="flex justify-center">
        <PentakillBanner count={recap.pentakills.ranking.entries[0]?.value ?? 0} total={recap.pentakills.total} />
      </Rise>
      <Rise delay={0.3} className="mx-auto mt-8 w-full max-w-xl">
        <Standings data={recap.pentakills.ranking} maxRows={5} />
        <p className="mt-3 text-center text-sm text-ink-dim">{recap.pentakills.ranking.leaderLine}</p>
      </Rise>
    </SceneFrame>
  );
}

export function Outnumbered({ recap }: { recap: Recap }) {
  if (!recap.outnumbered) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing title="1 vs the whole world." lead={recap.outnumbered.leaderLine} />
      <Rise delay={0.2} className="mx-auto mt-8 w-full max-w-2xl">
        <MeterBoard data={recap.outnumbered} max={6} />
      </Rise>
    </SceneFrame>
  );
}

export function Flawless({ recap }: { recap: Recap }) {
  if (!recap.flawless) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing
        title={
          <>
            <Hot tone="win">{recap.flawless.total}</Hot> flawless games.
          </>
        }
        lead="Won without a single death on the team. Surgical. Show-offs."
      />
      <Rise delay={0.2} className="mx-auto mt-8 w-full max-w-xl">
        <Standings data={recap.flawless.ranking} maxRows={6} />
      </Rise>
    </SceneFrame>
  );
}

export function ButtonMasher({ recap }: { recap: Recap }) {
  if (!recap.apm) return null;
  return (
    <SceneFrame variant="panel" act={ACT}>
      <Framing title="The closest thing we have to APM." lead={recap.apm.leaderLine} />
      <Rise delay={0.2} className="mx-auto mt-8 w-full max-w-2xl">
        <MeterBoard data={recap.apm} max={6} />
      </Rise>
    </SceneFrame>
  );
}

export function Duos({ recap }: { recap: Recap }) {
  const d = recap.duo;
  if (!d.deadliest && !d.bff && !d.hero) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing title="It takes two." lead="The pairings that defined your season — stuff op.gg literally cannot show you." />
      <div className="mt-10 flex flex-col items-center gap-12">
        {d.deadliest && (
          <Rise>
            <DuoCard
              a={d.deadliest.a.name}
              b={d.deadliest.b.name}
              champA={d.deadliest.a.champion}
              champB={d.deadliest.b.champion}
              headline={`${Math.round(d.deadliest.winrate * 100)}%`}
              sub={`together over ${d.deadliest.games} games — the deadliest duo`}
              tone="flex"
            />
          </Rise>
        )}
        <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
          {d.bff && (
            <Rise delay={0.1} className="notch-sm border border-line/70 bg-surface/60 p-5 text-center">
              <p className="text-2xs uppercase tracking-widest text-gold">Inseparable</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{d.bff.a.name} & {d.bff.b.name}</p>
              <p className="text-sm text-ink-dim">Queued together {d.bff.games} times. Get a room.</p>
            </Rise>
          )}
          {d.hero && (
            <Rise delay={0.18} className="notch-sm border border-line/70 bg-surface/60 p-5 text-center">
              <p className="text-2xs uppercase tracking-widest text-win">My Hero</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">{d.hero.name}</p>
              <p className="text-sm text-ink-dim">{d.hero.display} — yanked teammates out of certain death.</p>
            </Rise>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

export function ChampPool({ recap }: { recap: Recap }) {
  const cp = recap.champPool;
  if (!cp.cloud.length) return null;
  const max = Math.max(...cp.cloud.map((c) => c.count), 1);
  return (
    <SceneFrame variant="plain" act={ACT}>
      <Framing title="The champions you abused." />
      <Rise delay={0.15} className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
        {cp.cloud.map((c) => {
          const size = 38 + (c.count / max) * 52;
          return (
            <div key={c.champion} className="relative overflow-hidden rounded-lg ring-1 ring-line" style={{ width: size, height: size }} title={`${champName(c.champion)} · ${c.count} games`}>
              <Image src={champIcon(c.champion)} alt={champName(c.champion)} fill sizes="90px" className="scale-110 object-cover" unoptimized />
            </div>
          );
        })}
      </Rise>
      <Stagger className="mx-auto mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-2" amount={0.3}>
        {cp.otp && (
          <StaggerItem className="notch-sm border border-line/70 bg-surface/60 p-5 text-center">
            <p className="text-2xs uppercase tracking-widest text-gold">The One-Trick</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{cp.otp.name}</p>
            <p className="text-sm text-ink-dim">{Math.round(cp.otp.share * 100)}% of their games on {champName(cp.otp.champion)}. Loyalty or a problem?</p>
          </StaggerItem>
        )}
        {cp.flexer && (
          <StaggerItem className="notch-sm border border-line/70 bg-surface/60 p-5 text-center">
            <p className="text-2xs uppercase tracking-widest text-primary">Commitment Issues</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{cp.flexer.name}</p>
            <p className="text-sm text-ink-dim">{cp.flexer.distinct} different champions. Pick a main, coward.</p>
          </StaggerItem>
        )}
      </Stagger>
    </SceneFrame>
  );
}
