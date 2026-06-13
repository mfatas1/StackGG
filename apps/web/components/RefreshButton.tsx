"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui";

export function RefreshButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "queued">("idle");

  async function refresh() {
    setState("busy");
    const res = await fetch(`/api/crews/${slug}/refresh`, { method: "POST" });
    if (res.ok) {
      setState("queued");
      // Give the worker a moment, then pull fresh data into the page.
      setTimeout(() => {
        router.refresh();
        setState("idle");
      }, 4000);
    } else {
      setState("idle");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={refresh} disabled={state !== "idle"} title="Pull new matches">
      <RefreshCw className={`h-4 w-4 ${state === "busy" ? "animate-spin" : ""}`} />
      {state === "queued" ? "Updating…" : "Refresh"}
    </Button>
  );
}
