"use client";
import { useState } from "react";
import type { RankInfo } from "@crewstats/shared";
import { tierCrest } from "@/lib/format";
import { rankString } from "@/lib/format";
import { tierTone } from "@/components/ui";

export function RankCrest({
  rank,
  size = 22,
  withText = true,
}: {
  rank: RankInfo | null;
  size?: number;
  withText?: boolean;
}) {
  const [err, setErr] = useState(false);
  const url = tierCrest(rank?.tier);

  return (
    <span className="inline-flex items-center gap-1.5">
      {url && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={rank?.tier ?? ""} width={size} height={size} onError={() => setErr(true)} className="shrink-0" />
      ) : (
        <span
          className="inline-block shrink-0 rounded-full bg-surface-3"
          style={{ width: size, height: size }}
        />
      )}
      {withText && <span className={`text-xs ${tierTone(rank?.tier)}`}>{rankString(rank)}</span>}
    </span>
  );
}
