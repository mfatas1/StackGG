import { champSplash } from "@/lib/format";

/**
 * Champion splash banner. The splash sits behind a navy gradient so overlaid
 * content stays readable. Falls back to plain navy if the art fails to load.
 */
export function ChampSplashBanner({
  championName,
  children,
  className = "",
}: {
  championName?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-line ${className}`}>
      {championName && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:50%_22%]"
          style={{ backgroundImage: `url(${champSplash(championName)})` }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #010A13 0%, rgba(1,10,19,0.82) 45%, rgba(1,10,19,0.45) 100%), linear-gradient(0deg, #010A13 2%, transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
