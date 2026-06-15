import Link from "next/link";
import type { QueueSlug } from "@crewstats/shared";

const TABS: { slug: QueueSlug; label: string }[] = [
  { slug: "all", label: "SR" }, // ranked + flex (default; Arena/ARAM excluded from the winrate)
  { slug: "ranked", label: "Ranked" },
  { slug: "flex", label: "Flex" },
  { slug: "aram", label: "ARAM" },
  { slug: "arena", label: "Arena" },
];

/** Segmented queue filter. Active tab gets a coral underglow (DESIGN.md). */
export function QueueTabs({
  basePath,
  active,
  param = "q",
  preserve,
}: {
  basePath: string;
  active: QueueSlug;
  param?: string;
  preserve?: Record<string, string | undefined>;
}) {
  const href = (slug: QueueSlug) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve ?? {})) if (v) sp.set(k, v);
    if (slug !== "all") sp.set(param, slug);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <div className="notch notch-sm inline-flex gap-0.5 border border-line bg-bg/60 p-0.5 backdrop-blur">
      {TABS.map((t) => {
        const on = t.slug === active;
        return (
          <Link
            key={t.slug}
            href={href(t.slug)}
            aria-current={on ? "page" : undefined}
            className={`notch notch-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              on
                ? "bg-surface-3 text-ink shadow-[inset_0_-2px_0_oklch(var(--primary)/0.7)]"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function parseQueueSlug(value: string | undefined): QueueSlug {
  if (value === "ranked" || value === "flex" || value === "aram" || value === "arena") return value;
  return "all";
}
