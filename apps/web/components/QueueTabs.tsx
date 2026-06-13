import Link from "next/link";
import type { QueueSlug } from "@crewstats/shared";

const TABS: { slug: QueueSlug; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "ranked", label: "Ranked" },
  { slug: "flex", label: "Flex" },
  { slug: "aram", label: "ARAM" },
  { slug: "arena", label: "Arena" },
];

export function QueueTabs({ basePath, active }: { basePath: string; active: QueueSlug }) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-bg-raised p-1">
      {TABS.map((t) => (
        <Link
          key={t.slug}
          href={t.slug === "all" ? basePath : `${basePath}?q=${t.slug}`}
          className={`tab ${t.slug === active ? "tab-active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function parseQueueSlug(value: string | undefined): QueueSlug {
  if (value === "ranked" || value === "flex" || value === "aram" || value === "arena") return value;
  return "all";
}
