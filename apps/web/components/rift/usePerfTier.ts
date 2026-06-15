"use client";
import { useEffect, useState } from "react";

export type PerfTier = "static" | "lite" | "full";

/**
 * Perf-tier detection (FRONTEND_PLAN §4.2). The canvas must never cost the data:
 *  - static: reduced-motion / save-data / no WebGL → poster only, no canvas
 *  - lite:   mobile / low memory → reduced terrain detail, capped DPR, no DOF
 *  - full:   desktop with memory → full terrain + bloom
 * Returns "static" on the server / first paint so WebGL is never in first paint.
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>("static");
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // @ts-expect-error non-standard
    const saveData = navigator.connection?.saveData === true;
    if (reduce || saveData || !hasWebGL()) return setTier("static");
    // @ts-expect-error non-standard
    const mem: number | undefined = navigator.deviceMemory;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if ((mem != null && mem < 4) || coarse || window.innerWidth < 820) return setTier("lite");
    setTier("full");
  }, []);
  return tier;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
