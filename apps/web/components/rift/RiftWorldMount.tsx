"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePerfTier } from "./usePerfTier";
import { RiftPoster } from "./RiftPoster";
import { useTheme } from "../theme/themeStore";
import { paletteFor } from "../theme/themes";

const RiftWorld = dynamic(() => import("./RiftWorld").then((m) => m.RiftWorld), { ssr: false });

// Brand surfaces get the live, immersive Rift. Everywhere else (the data screens —
// dashboard, snapshot, member, settings, account, legal) gets the FROZEN poster:
// same world, no motion, zero WebGL frames, so the data stays the hero and the
// daily-use pages are calm and cheap (FRONTEND_PLAN §1: legibility wins every tie).
function isBrandRoute(pathname: string): boolean {
  return pathname === "/" || pathname === "/stack/new" || pathname.startsWith("/join/");
}

/**
 * Persistent Rift background. The poster is always the base layer; the live WebGL
 * world fades in over it only on brand routes. Re-keyed on theme so it repaints
 * into the active palette.
 */
export function RiftWorldMount() {
  const pathname = usePathname() ?? "/";
  const tier = usePerfTier();
  const theme = useTheme();
  const [lit, setLit] = useState(false);

  const live = isBrandRoute(pathname) && tier !== "static";

  useEffect(() => {
    setLit(false);
    if (live) {
      const id = requestAnimationFrame(() => setLit(true));
      return () => cancelAnimationFrame(id);
    }
  }, [live, pathname]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <RiftPoster theme={theme} />
      {live && (
        <div className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${lit ? "opacity-100" : "opacity-0"}`}>
          <RiftWorld key={theme} tier={tier as "lite" | "full"} palette={paletteFor(theme)} />
        </div>
      )}
    </div>
  );
}
