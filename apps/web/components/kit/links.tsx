import Link from "next/link";

/** Canonical player link: crew member page when in a crew, else global snapshot. */
export function playerHref(opts: { riotId: string; tag: string; region?: string; crewSlug?: string }): string {
  const full = encodeURIComponent(`${opts.riotId}#${opts.tag}`);
  if (opts.crewSlug) return `/stack/${opts.crewSlug}/player/${full}`;
  return `/player/${opts.region ?? "euw1"}/${full}`;
}

export function PlayerLink({
  riotId,
  tag,
  region,
  crewSlug,
  className = "",
  children,
}: {
  riotId: string;
  tag: string;
  region?: string;
  crewSlug?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={playerHref({ riotId, tag, region, crewSlug })} className={`transition-colors hover:text-primary ${className}`}>
      {children ?? riotId}
    </Link>
  );
}
