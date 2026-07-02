"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { champName, champLoading } from "@/lib/format";
import type { Recap } from "@/lib/recap/types";
import { Portrait } from "./atoms";

/** A literal spotlight/podium for Player of the Season — splash, crown, the carry numbers. */
export function MVPSpotlight({ mvp }: { mvp: NonNullable<Recap["mvp"]> }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center gap-5">
      {/* spotlight cone */}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[140%] w-[120%] -translate-x-1/2" style={{ background: "radial-gradient(50% 60% at 50% 0%, oklch(var(--gold) / 0.28), transparent 70%)" }} />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl">👑</span>
        <div className="notch overflow-hidden border-2 border-gold shadow-glow-gold" style={{ width: 240, height: 300 }}>
          {mvp.champion ? (
            <Image src={champLoading(mvp.champion)} alt={champName(mvp.champion)} fill sizes="240px" className="object-cover object-top" unoptimized />
          ) : null}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, oklch(var(--bg) / 0.9))" }} />
          <div className="absolute inset-x-0 bottom-0 p-3 text-center">
            <p className="font-display text-2xl font-extrabold text-gold">{mvp.name}</p>
          </div>
        </div>
      </motion.div>
      <div className="flex gap-6 text-center">
        <Stat label="Win rate" value={`${Math.round(mvp.winrate * 100)}%`} />
        <Stat label="KDA" value={mvp.kda.toFixed(1)} />
        <Stat label="Team MVP" value={`${mvp.mvpGames}×`} />
      </div>
      {mvp.runnerUp && (
        <p className="text-sm text-ink-dim">
          Edged out <span className="font-semibold text-ink">{mvp.runnerUp.name}</span> for the crown.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="tnum font-display text-2xl font-bold text-ink">{value}</span>
      <span className="text-2xs uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

/** Two portraits fused, combined record — deadliest duo / BFFs. */
export function DuoCard({
  a,
  b,
  champA,
  champB,
  headline,
  sub,
  tone = "flex",
}: {
  a: string;
  b: string;
  champA: string;
  champB: string;
  headline: string;
  sub: string;
  tone?: "flex" | "neutral";
}) {
  const accent = tone === "flex" ? "text-gold" : "text-primary";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center">
        <div className="rotate-[-4deg]"><Portrait champion={champA} size={150} tone={tone} /></div>
        <div className="z-10 -mx-5 grid h-12 w-12 place-items-center rounded-full border border-line bg-bg font-display text-sm font-bold text-ink-dim">+</div>
        <div className="rotate-[4deg]"><Portrait champion={champB} size={150} tone={tone} /></div>
      </div>
      <div className="text-center">
        <p className="font-display text-xl font-bold text-ink">
          {a} <span className="text-ink-faint">&</span> {b}
        </p>
        <p className={`font-display text-4xl font-extrabold ${accent}`}>{headline}</p>
        <p className="text-sm text-ink-dim">{sub}</p>
      </div>
    </div>
  );
}
