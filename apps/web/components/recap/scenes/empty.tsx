"use client";
import Link from "next/link";
import type { Recap } from "@/lib/recap/types";
import { SceneFrame, Rise } from "../kit";
import { Title, Lead } from "./_shared";

/** Designed empty state — common for the week cut. Never a blank/broken story. */
export function QuietWeek({ recap }: { recap: Recap }) {
  return (
    <SceneFrame variant="plain">
      <div className="flex flex-col items-center gap-5 text-center">
        <Rise>
          <span className="text-5xl">🌙</span>
        </Rise>
        <Rise delay={0.1}>
          <Title className="text-center">A quiet {recap.meta.window === "week" ? "week" : "season"} on the Rift.</Title>
        </Rise>
        <Rise delay={0.2}>
          <Lead className="text-center">
            {recap.meta.window === "week"
              ? "Not enough games to roast anyone yet. Queue up a few and check back — the rap sheet writes itself."
              : "There aren't enough ranked games this season to build a recap. Play some Summoner's Rift and come back."}
          </Lead>
        </Rise>
        <Rise delay={0.3} className="flex gap-3">
          <Link href={`/stack/${recap.meta.slug}`} className="rounded-pill border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink">
            Back to {recap.meta.stackName}
          </Link>
          {recap.meta.window === "week" && (
            <Link href={`/stack/${recap.meta.slug}/recap?window=season`} className="rounded-pill border border-gold/50 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20">
              See the full season →
            </Link>
          )}
        </Rise>
      </div>
    </SceneFrame>
  );
}
