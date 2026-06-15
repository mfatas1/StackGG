"use client";
import { useSyncExternalStore, useEffect } from "react";

/**
 * A tiny external store for the persistent Rift camera (FRONTEND_PLAN §4.1). The
 * <RiftWorld> canvas lives once in the root layout and never unmounts, so route
 * changes are a CAMERA MOVE through one continuous world, not a reload. Each route
 * registers a target pose; the camera damps toward it. Scroll progress on the
 * landing drives the "descent" between two poses.
 */

export type Pose = { px: number; py: number; pz: number; tx: number; ty: number; tz: number; fov: number };

export const POSES: Record<string, Pose> = {
  // Landing top — low and cinematic, standing at the foot of the Rift looking up mid-lane into the fog.
  hero: { px: 0, py: 12, pz: 12, tx: 0, ty: -0.7, tz: -1, fov: 43 },
  // Landing scrolled — descended down toward the deck, banked into a lane.
  dive: { px: 3.5, py: 3.2, pz: 9.5, tx: -1, ty: 0.6, tz: -4, fov: 56 },
  // Product surfaces — pulled back into the haze so lit panels sit in front; calm, recedes.
  surface: { px: 0, py: 15, pz: 23, tx: 0, ty: -1, tz: -3, fov: 36 },
  // Join welcome — a touch of drama, rotated in from the side.
  join: { px: -8, py: 3.6, pz: 12, tx: 0, ty: 1, tz: -4, fov: 54 },
};

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    px: m(a.px, b.px), py: m(a.py, b.py), pz: m(a.pz, b.pz),
    tx: m(a.tx, b.tx), ty: m(a.ty, b.ty), tz: m(a.tz, b.tz),
    fov: m(a.fov, b.fov),
  };
}

let current: Pose = POSES.surface!;
const listeners = new Set<() => void>();

export function setPose(p: Pose) {
  current = p;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot() {
  return current;
}

export function useTargetPose(): Pose {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Register a static target pose for a route (product surfaces). */
export function useRoutePose(name: keyof typeof POSES) {
  useEffect(() => {
    setPose(POSES[name]!);
  }, [name]);
}
