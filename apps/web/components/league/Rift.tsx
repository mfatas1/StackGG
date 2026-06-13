import { RIFT_MAP_URL } from "@/lib/format";

/**
 * Summoner's Rift map as an atmospheric backdrop. Darkened and teal-tinted,
 * radially faded so it reads as texture, never competing with content.
 */
export function RiftBackdrop({
  className = "",
  opacity = 0.12,
  position = "center",
}: {
  className?: string;
  opacity?: number;
  position?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${RIFT_MAP_URL})`,
          backgroundPosition: position,
          opacity,
          filter: "saturate(1.1) hue-rotate(-6deg) brightness(0.9)",
          maskImage: "radial-gradient(120% 100% at 50% 30%, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 100% at 50% 30%, black 25%, transparent 75%)",
        }}
      />
    </div>
  );
}
