import type { PlayerIdentity } from "@crewstats/shared";
import type { PlayerTag } from "@crewstats/stats";
import { ProfileIcon } from "@/components/kit/Avatar";
import { PlayerLink } from "@/components/kit/links";
import { Empty } from "@/components/kit/Frame";

// Mirrors the leaderboard chips (Ladder.tsx) so tags read identically wherever they appear.
const TAG_TONE: Record<PlayerTag["tone"], string> = {
  shame: "bg-loss/12 text-loss ring-loss/25",
  flex: "bg-gold/12 text-gold ring-gold/30",
  neutral: "bg-primary/12 text-primary ring-primary/30",
};
const CHIP =
  "inline-flex cursor-default items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-tight ring-1 ring-inset";

/**
 * Standalone playstyle-tag panel: every member that has tags, with their tag chips. Same
 * z-score tags that hover on the leaderboard, surfaced as a first-class panel for casual
 * stacks. Tags only unlock at a 5-eligible-player stack, so below that this shows an Empty.
 */
export function TagsPanel({
  members,
  tags,
  crewSlug,
}: {
  members: PlayerIdentity[];
  tags: Record<string, PlayerTag[]>;
  crewSlug: string;
}) {
  const tagged = members.filter((m) => (tags[m.puuid]?.length ?? 0) > 0);
  if (!tagged.length)
    return <Empty>Tags unlock once your stack has 5 players with 10+ ranked/flex games each.</Empty>;

  return (
    <ul className="flex flex-1 flex-col gap-3">
      {tagged.map((m) => (
        <li key={m.puuid} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PlayerLink
            riotId={m.riotId}
            tag={m.tag}
            region={m.region}
            crewSlug={crewSlug}
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-gold"
          >
            <ProfileIcon id={m.profileIcon} name={m.riotId} size={24} />
            <span className="truncate">{m.riotId}</span>
          </PlayerLink>
          <div className="flex flex-wrap gap-1">
            {tags[m.puuid]!.map((t) => (
              <span key={t.key} className={`${CHIP} ${TAG_TONE[t.tone]}`} title={`${t.meaning} — ${t.detail}`}>
                {t.label}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
