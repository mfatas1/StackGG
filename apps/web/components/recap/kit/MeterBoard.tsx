"use client";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { champIcon, champName } from "@/lib/format";
import type { RComparison } from "@/lib/recap/types";
import { TONE } from "./atoms";

/**
 * A broadcast tachometer board: each member's value as a segmented meter that lights up like an
 * esports overlay. Sleeker sibling of the bar Standings, for the glory/stat scenes so the recap
 * never shows the same chart twice in a row.
 */
export function MeterBoard({ data, max = 6, segments = 16 }: { data: RComparison; max?: number; segments?: number }) {
  const reduce = useReducedMotion();
  const rows = data.entries.slice(0, max);
  const maxV = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const t = TONE[data.tone];

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => {
        const lead = i === 0;
        const lit = Math.max(1, Math.round((Math.abs(r.value) / maxV) * segments));
        return (
          <motion.div
            key={r.puuid}
            className="flex items-center gap-3"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <span className={`w-4 text-center font-display text-sm font-bold ${lead ? t.text : "text-ink-faint"}`}>{i + 1}</span>
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-line">
              {r.champion ? (
                <Image src={champIcon(r.champion)} alt={champName(r.champion)} fill sizes="28px" className="scale-110 object-cover" unoptimized />
              ) : (
                <div className="h-full w-full bg-surface-2" />
              )}
            </div>
            <span className={`w-24 shrink-0 truncate text-sm font-semibold ${lead ? "text-ink" : "text-ink-dim"}`}>{r.name}</span>
            <div className="flex flex-1 gap-[2px]">
              {Array.from({ length: segments }).map((_, s) => {
                const on = s < lit;
                return (
                  <motion.span
                    key={s}
                    className={`h-4 flex-1 rounded-[1px] ${on ? (lead ? t.bg : "bg-line-strong") : "bg-surface-2/80"}`}
                    initial={reduce ? false : { opacity: 0 }}
                    whileInView={{ opacity: on ? 1 : 0.5 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.2, delay: 0.2 + i * 0.06 + s * 0.02 }}
                  />
                );
              })}
            </div>
            <span className={`tnum w-20 shrink-0 text-right text-sm font-bold ${lead ? t.text : "text-ink-dim"}`}>{r.display}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
