"use client";
import Image from "next/image";
import { champIcon, champName } from "@/lib/format";
import type { RStatTable } from "@/lib/recap/types";

/** A dense per-member table for the expandable deep-dive panels. */
export function StatTable({ table, highlightFirst = true }: { table: RStatTable; highlightFirst?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-2xl overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-2xs uppercase tracking-wide text-ink-faint">
            {table.columns.map((c, i) => (
              <th key={c} className={`py-2 font-semibold ${i === 0 ? "text-left" : "text-right"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={r.puuid} className={`border-b border-line/40 ${highlightFirst && ri === 0 ? "text-ink" : "text-ink-dim"}`}>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-line">
                    {r.champion ? (
                      <Image src={champIcon(r.champion)} alt={champName(r.champion)} fill sizes="24px" className="scale-110 object-cover" unoptimized />
                    ) : (
                      <div className="h-full w-full bg-surface-2" />
                    )}
                  </div>
                  <span className="truncate font-semibold">{r.name}</span>
                </div>
              </td>
              {r.cells.map((cell, ci) => (
                <td key={ci} className="tnum py-2 text-right">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
