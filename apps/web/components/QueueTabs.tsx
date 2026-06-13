import Link from "next/link";
import type { QueueSlug } from "@crewstats/shared";

const TABS: { slug: QueueSlug; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "ranked", label: "Ranked" },
  { slug: "flex", label: "Flex" },
  { slug: "aram", label: "ARAM" },
  { slug: "arena", label: "Arena" },
];

/** Segmented control. Each tab is a link that sets ?q= (keeps it server-rendered). */
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
    <div className="inline-flex gap-0.5 rounded border border-line bg-surface p-0.5">
      {TABS.map((t) => {
        const on = t.slug === active;
        return (
          <Link
            key={t.slug}
            href={href(t.slug)}
            aria-current={on ? "page" : undefined}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              on ? "bg-surface-3 text-ink shadow-[inset_0_0_0_1px_oklch(0.73_0.17_45/0.25)]" : "text-ink-dim hover:text-ink"
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
