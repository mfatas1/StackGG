"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "../kit/Button";

/**
 * Pulls this profile's recent games on demand (bypasses the freshness window) and
 * navigates to ?refreshing=1 so the download banner lights up and streams games in.
 */
export function RefreshProfileButton({ riotId, region }: { riotId: string; region: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/player/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ riotId, region }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Couldn't refresh.");
        setLoading(false);
        return;
      }
      // The re-pull is now queued; the work happens in the background worker and is
      // surfaced by the download banner (?refreshing=1), not this button. Stop our own
      // spinner so it doesn't hang forever — a soft nav to the same route keeps this
      // component mounted, so we must clear loading explicitly.
      router.push(`${pathname}?refreshing=1`);
      setLoading(false);
    } catch {
      setErr("Couldn't refresh.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" size="sm" onClick={refresh} loading={loading} title="Pull your latest games from Riot">
        {!loading && <RefreshCw className="h-4 w-4" />}
        Refresh
      </Button>
      {err && <span className="text-2xs text-loss">{err}</span>}
    </div>
  );
}
