import * as THREE from "three";
import { drawRift } from "./riftPaint";
import type { RiftPalette } from "../theme/themes";

export interface RiftMaps {
  albedo: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
  height: THREE.CanvasTexture;
}

/** Wrap the 2D-painted Rift canvases (for the active theme) as three textures. */
export function buildRiftMaps(palette: RiftPalette, key: string): RiftMaps {
  const { albedoCanvas, emissiveCanvas, heightCanvas } = drawRift(palette, key);
  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(emissiveCanvas);
  emissive.colorSpace = THREE.SRGBColorSpace;
  const height = new THREE.CanvasTexture(heightCanvas);
  return { albedo, emissive, height };
}
