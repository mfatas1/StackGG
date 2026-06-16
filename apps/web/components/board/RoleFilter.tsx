import Link from "next/link";
import { RoleIcon } from "../kit/Avatar";
import { filterHref, LANES } from "@/lib/filters";

/**
 * Lane filter for the match history — All + the five roles. Preserves queue + champion.
 * When a champion is selected, `availableRoles` lists the lanes that champ was actually
 * played in; the rest are grayed out and not clickable (avoids dead-end "no games").
 */
export function RoleFilter({
  basePath,
  active,
  q,
  champ,
  availableRoles,
}: {
  basePath: string;
  active?: string;
  q?: string;
  champ?: string;
  availableRoles?: string[];
}) {
  const Tab = (repr: string | undefined, label: string, icon?: React.ReactNode) => {
    const on = (repr ?? null) === (active ?? null);
    // "All lanes" (repr undefined) is always enabled; a specific lane is disabled when a
    // champ is filtered and that lane isn't in the champ's played set.
    const disabled = repr != null && availableRoles != null && !availableRoles.includes(repr);
    const cls = `notch notch-sm inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors`;

    if (disabled) {
      return (
        <span key={repr} aria-disabled className={`${cls} cursor-not-allowed border-line/40 bg-surface-2/20 text-ink-faint/40`}>
          {icon}
          {label}
        </span>
      );
    }
    const target = on ? undefined : repr; // clicking the active one clears it
    return (
      <Link
        key={repr ?? "all"}
        href={filterHref(basePath, { q, champ, role: target })}
        aria-current={on ? "true" : undefined}
        scroll={false}
        className={`${cls} ${on ? "border-gold/60 bg-gold/15 text-ink" : "border-line/60 bg-surface-2/40 text-ink-dim hover:text-ink"}`}
      >
        {icon}
        {label}
      </Link>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Tab(undefined, "All lanes")}
      {LANES.map((l) => Tab(l.key, l.label, <RoleIcon role={l.key} size={14} />))}
    </div>
  );
}
