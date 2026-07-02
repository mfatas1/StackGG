"use client";
import { motion, useReducedMotion } from "motion/react";
import type { RComparison } from "@/lib/recap/types";
import { ChampMug } from "./atoms";

/**
 * A graveyard: each member is a headstone whose height scales with how long they stay dead. The
 * worst offender towers over the plot, lit in loss red. Playful replacement for a bar chart.
 */
export function TombstoneRow({ data, max = 7 }: { data: RComparison; max?: number }) {
  const reduce = useReducedMotion();
  const rows = data.entries.slice(0, max);
  const maxV = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
      {rows.map((r, i) => {
        const h = 96 + (r.value / maxV) * 92;
        const lead = i === 0;
        return (
          <motion.div
            key={r.puuid}
            className="flex flex-col items-center gap-1"
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={`relative flex w-[78px] flex-col items-center rounded-t-[42%] border-2 pt-3 ${
                lead ? "border-loss/70 bg-loss/10" : "border-line bg-surface-2/70"
              }`}
              style={{ height: h }}
            >
              <span className={`font-display text-2xs font-bold tracking-widest ${lead ? "text-loss" : "text-ink-faint"}`}>R.I.P</span>
              <div className="mt-1.5">
                <ChampMug champion={r.champion} size={34} tone={lead ? "shame" : "neutral"} />
              </div>
              <span className={`mt-1.5 tnum text-xs font-bold ${lead ? "text-loss" : "text-ink-dim"}`}>{r.display}</span>
            </div>
            {/* mound */}
            <div className={`h-1.5 w-[86px] rounded-b-full ${lead ? "bg-loss/40" : "bg-line-strong/50"}`} />
            <span className="max-w-[86px] truncate text-2xs text-ink-dim">{r.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
