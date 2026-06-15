"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

export function CopyInvite({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={copy}
      className="notch notch-sm inline-flex h-9 items-center gap-2 border border-line bg-bg/50 px-3 text-sm font-medium text-ink-dim backdrop-blur transition-colors hover:border-gold/50 hover:text-ink"
    >
      {done ? <Check className="h-4 w-4 text-win" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : "Copy invite link"}
    </button>
  );
}

export function RefreshButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      await fetch(`/api/crews/${slug}/refresh`, { method: "POST" });
      router.refresh();
    } finally {
      setTimeout(() => setBusy(false), 800);
    }
  }
  return (
    <button
      onClick={refresh}
      disabled={busy}
      className="notch notch-sm grid h-9 w-9 place-items-center border border-line bg-bg/50 text-ink-dim backdrop-blur transition-colors hover:border-gold/50 hover:text-ink disabled:opacity-60"
      aria-label="Refresh stack data"
      title="Pull new games"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}
