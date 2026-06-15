"use client";
import { useRoutePose, POSES } from "./riftStore";

/**
 * Sets the persistent Rift camera for a product route AND lays a dimming scrim
 * over the world so the data reads cleanly — on product surfaces the 3D recedes
 * hardest (FRONTEND_PLAN §1). The landing drives the camera itself and stays bright.
 */
export function RoutePose({ name }: { name: keyof typeof POSES }) {
  useRoutePose(name);
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5] bg-bg/55" />;
}
