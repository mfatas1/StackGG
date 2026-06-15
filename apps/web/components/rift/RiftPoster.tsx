"use client";
import { useEffect, useState } from "react";
import { drawRift } from "./riftPaint";
import { paletteFor } from "../theme/themes";

/**
 * Static-tier fallback (FRONTEND_PLAN §4.2) + the base layer under the live canvas:
 * our ORIGINAL hand-painted Summoner's Rift (drawRift), tilted into perspective and
 * tinted to the active theme. Pure 2D canvas (no three.js, no WebGL) so reduced-motion
 * / no-WebGL users still get the Rift, and the product pages show it quietly behind the
 * data. (We use the painted map here rather than the flat minimap PNG — it reads richer.)
 */
export function RiftPoster({ theme }: { theme: string }) {
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    // drawRift paints on a <canvas>, so it must run on the client.
    setPoster(drawRift(paletteFor(theme), theme).posterDataUrl);
  }, [theme]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={{ background: "oklch(var(--bg))" }}>
      {poster && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{
            backgroundImage: `url(${poster})`,
            transform: "perspective(1200px) rotateX(34deg) scale(1.55)",
            transformOrigin: "50% 40%",
            filter: "brightness(0.92) saturate(1.05)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-transparent to-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_15%,transparent_30%,oklch(var(--bg))_85%)]" />
    </div>
  );
}
