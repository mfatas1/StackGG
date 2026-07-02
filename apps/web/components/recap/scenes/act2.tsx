"use client";
import type { Recap } from "@/lib/recap/types";
import { SceneFrame, PlayerCard, Rise } from "../kit";
import { Title, Lead } from "./_shared";

const ACT = "Act II · The Cast";

export function RosterIntro({ recap }: { recap: Recap }) {
  void recap;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <div className="flex flex-col items-center gap-4">
        <Rise>
          <Title className="text-center">Every stack has its main characters.</Title>
        </Rise>
        <Rise delay={0.15}>
          <Lead className="text-center">Here&apos;s yours — sorted into the roles you earned, whether you like them or not.</Lead>
        </Rise>
      </div>
    </SceneFrame>
  );
}

/** One or two roster cards, given their own scene so each archetype lands. */
export function RosterChunk({ recap, start, count }: { recap: Recap; start: number; count: number }) {
  const cards = recap.roster.slice(start, start + count);
  if (!cards.length) return null;
  return (
    <SceneFrame variant="plain" act={ACT}>
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-wrap items-stretch justify-center gap-6">
          {cards.map((c, i) => (
            <PlayerCard key={c.puuid} card={c} delay={i * 0.12} big={count === 1} />
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}
