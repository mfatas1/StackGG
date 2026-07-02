"use client";
import { motion, useReducedMotion } from "motion/react";
import { champIcon, champName } from "@/lib/format";
import Image from "next/image";
import type { RComparison } from "@/lib/recap/types";
import { TONE } from "./atoms";

/**
 * The comparison workhorse — a post-game-scoreboard-style ranking that pits the whole stack
 * against each other on one metric. Leader-first, bars proportional to value, the leader lit in
 * the tone accent. This is what makes the recap *relative* rather than a wall of solo trophies.
 */
export function Standings({ data, maxRows = 6 }: { data: RComparison; maxRows?: number }) {
  const reduce = useReducedMotion();
  const rows = data.entries.slice(0, maxRows);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const t = TONE[data.tone];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => {
          const lead = i === 0;
          const pct = Math.max(6, (Math.abs(r.value) / max) * 100);
          return (
            <motion.div
              key={r.puuid}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className={`notch-sm relative flex items-center gap-3 overflow-hidden border px-3 py-2.5 ${
                lead ? `${t.border} ${t.soft}` : "border-line/70 bg-surface/60"
              }`}
            >
              {/* growth bar */}
              <motion.div
                aria-hidden
                className={`absolute inset-y-0 left-0 ${lead ? t.bg : "bg-line-strong"} ${lead ? "opacity-20" : "opacity-[0.12]"}`}
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                style={reduce ? { width: `${pct}%` } : undefined}
              />
              <span className={`relative w-5 text-center font-display text-sm font-bold ${lead ? t.text : "text-ink-faint"}`}>
                {i + 1}
              </span>
              <div className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ${lead ? t.ring : "ring-line"}`}>
                {r.champion ? (
                  <Image src={champIcon(r.champion)} alt={champName(r.champion)} fill sizes="36px" className="scale-110 object-cover" unoptimized />
                ) : (
                  <div className="h-full w-full bg-surface-2" />
                )}
              </div>
              <span className={`relative flex-1 truncate text-sm font-semibold ${lead ? "text-ink" : "text-ink-dim"}`}>{r.name}</span>
              <span className={`relative tnum text-sm font-bold ${lead ? t.text : "text-ink-dim"}`}>{r.display}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
