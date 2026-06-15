"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "../kit/Button";

/**
 * Forces a full-season re-pull for this profile (bypasses the freshness window) and
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
      router.push(`${pathname}?refreshing=1`);
    } catch {
      setErr("Couldn't refresh.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" size="sm" onClick={refresh} loading={loading} title="Re-pull your full season history from Riot">
        {!loading && <RefreshCw className="h-4 w-4" />}
        Refresh
      </Button>
      {err && <span className="text-2xs text-loss">{err}</span>}
    </div>
  );
}
