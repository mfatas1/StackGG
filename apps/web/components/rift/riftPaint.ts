import type { RiftPalette } from "../theme/themes";

/**
 * The Rift, painted from scratch on 2D canvases — an ORIGINAL stylized Summoner's
 * Rift (never Riot map assets). Pure 2D, NO three.js. Produces albedo / emissive /
 * height maps. The 3D layer (RiftWorld) places turrets, inhibitors and nexuses on
 * top using the same coordinate system (see toMap there). Lanes + jungle paths +
 * river + Baron/Dragon pits are painted here; the relief is kept gentle.
 */

const SIZE = 1024;
const C = SIZE / 2;
const INSET = SIZE * 0.085;
const BS = SIZE * 0.165; // base inset from corner
export const BLUE = { x: BS, y: SIZE - BS }; // bottom-left
export const RED = { x: SIZE - BS, y: BS }; // top-right
const TL = { x: BS, y: BS };
const BR = { x: SIZE - BS, y: SIZE - BS };
export const BARON = { x: 432, y: 372 };
export const DRAGON = { x: 612, y: 652 };

// Jungle camp clearings, by quadrant (blue side = x<y).
export const CAMPS = [
  { x: 322, y: 470 }, { x: 402, y: 372 }, // blue top jungle
  { x: 436, y: 700 }, { x: 330, y: 776 }, // blue bot jungle
  { x: 622, y: 324 }, { x: 694, y: 248 }, // red top jungle
  { x: 588, y: 700 }, { x: 700, y: 654 }, // red bot jungle
  { x: 470, y: 452 }, { x: 554, y: 572 }, // inner (buff-ish, near river)
];

// Winding jungle paths (polylines) connecting lanes ↔ camps ↔ river.
const JPATHS: { x: number; y: number }[][] = [
  [{ x: 205, y: 650 }, { x: 300, y: 560 }, { x: 322, y: 470 }, { x: 402, y: 372 }, { x: 470, y: 452 }],
  [{ x: 265, y: 820 }, { x: 330, y: 776 }, { x: 436, y: 700 }, { x: 520, y: 650 }, { x: 554, y: 572 }],
  [{ x: 818, y: 372 }, { x: 720, y: 462 }, { x: 694, y: 248 }, { x: 622, y: 324 }, { x: 554, y: 252 }],
  [{ x: 758, y: 818 }, { x: 700, y: 654 }, { x: 588, y: 700 }, { x: 504, y: 640 }, { x: 470, y: 572 }],
];

export interface RiftPaint {
  albedoCanvas: HTMLCanvasElement;
  emissiveCanvas: HTMLCanvasElement;
  heightCanvas: HTMLCanvasElement;
  posterDataUrl: string;
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  return [c, c.getContext("2d")!];
}
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
function smoothNoise(x: number, y: number, scale: number): number {
  const sx = x / scale, sy = y / scale;
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const fx = sx - x0, fy = sy - y0;
  const a = noise(x0, y0), b = noise(x0 + 1, y0), c = noise(x0, y0 + 1), d = noise(x0 + 1, y0 + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function clipPlayable(ctx: CanvasRenderingContext2D) {
  roundRect(ctx, INSET, INSET, SIZE - 2 * INSET, SIZE - 2 * INSET, SIZE * 0.26);
  ctx.clip();
}
function lanePath(ctx: CanvasRenderingContext2D, which: "mid" | "top" | "bot") {
  ctx.beginPath();
  if (which === "mid") {
    ctx.moveTo(BLUE.x, BLUE.y);
    ctx.lineTo(RED.x, RED.y);
  } else if (which === "top") {
    ctx.moveTo(BLUE.x, BLUE.y);
    ctx.lineTo(TL.x, TL.y);
    ctx.lineTo(RED.x, RED.y);
  } else {
    ctx.moveTo(BLUE.x, BLUE.y);
    ctx.lineTo(BR.x, BR.y);
    ctx.lineTo(RED.x, RED.y);
  }
}
function riverPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(TL.x + 56, TL.y + 56);
  ctx.lineTo(BR.x - 56, BR.y - 56);
}
function polyline(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!, cur = pts[i]!;
    const mx = (prev.x + cur.x) / 2, my = (prev.y + cur.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
}

export const cache = new Map<string, RiftPaint>();

export function drawRift(p: RiftPalette, key: string): RiftPaint {
  const hit = cache.get(key);
  if (hit) return hit;
  const [m0, m1, m2] = p.jungleMult;

  // ---------- ALBEDO ----------
  const [albedoCanvas, a] = makeCanvas();
  a.fillStyle = p.daylight ? "#7d92a6" : "#070b10";
  a.fillRect(0, 0, SIZE, SIZE);
  a.save();
  clipPlayable(a);

  // jungle floor with side tint
  for (let y = 0; y < SIZE; y += 8) {
    for (let x = 0; x < SIZE; x += 8) {
      const n = smoothNoise(x, y, 80) * 0.7 + smoothNoise(x, y, 30) * 0.3;
      const l = p.jungleBase + n * p.jungleRange;
      let r = l * m0, g = l * m1, bl = l * m2;
      const side = Math.max(-1, Math.min(1, (y - x) / 260));
      r += -side * 6; bl += side * 8;
      a.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)})`;
      a.fillRect(x, y, 8, 8);
    }
  }

  // (no jungle paths — keep the jungle floor clean; only lanes + river are carved)

  // river
  a.save();
  a.strokeStyle = p.river;
  a.lineWidth = 48;
  a.lineCap = "round";
  a.globalAlpha = 0.82;
  riverPath(a);
  a.stroke();
  a.globalAlpha = 1;
  for (const pit of [BARON, DRAGON]) {
    a.beginPath();
    a.arc(pit.x, pit.y, 46, 0, Math.PI * 2);
    a.fill();
  }
  a.restore();

  // lanes (sandy paths)
  a.save();
  a.strokeStyle = p.lane;
  a.lineCap = "round";
  a.lineJoin = "round";
  for (const lane of ["top", "bot", "mid"] as const) {
    a.lineWidth = lane === "mid" ? 58 : 54;
    lanePath(a, lane);
    a.stroke();
  }
  a.restore();

  // base platforms
  for (const [base, col] of [[BLUE, p.baseA] as const, [RED, p.baseB] as const]) {
    const g = a.createRadialGradient(base.x, base.y, 10, base.x, base.y, BS * 1.2);
    g.addColorStop(0, col);
    g.addColorStop(0.62, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    a.fillStyle = g;
    a.beginPath();
    a.arc(base.x, base.y, BS * 1.2, 0, Math.PI * 2);
    a.fill();
  }
  a.restore();

  // ---------- EMISSIVE ----------
  const [emissiveCanvas, e] = makeCanvas();
  e.fillStyle = "#000";
  e.fillRect(0, 0, SIZE, SIZE);
  e.save();
  clipPlayable(e);
  // river glow
  e.save();
  e.shadowColor = p.riverGlowShadow;
  e.shadowBlur = 20;
  e.strokeStyle = p.riverGlow;
  e.lineWidth = 7;
  e.lineCap = "round";
  riverPath(e);
  e.stroke();
  e.restore();
  // lane glow
  e.save();
  e.shadowColor = p.laneGlowShadow;
  e.shadowBlur = 16;
  e.strokeStyle = p.laneGlow;
  e.lineWidth = 5;
  e.lineCap = "round";
  e.lineJoin = "round";
  for (const lane of ["mid", "top", "bot"] as const) {
    lanePath(e, lane);
    e.stroke();
  }
  e.restore();
  // baron (violet) + dragon (amber)
  for (const [pit, inner, outer] of [
    [BARON, "rgba(190,150,255,1)", "rgba(120,70,210,0.55)"] as const,
    [DRAGON, "rgba(255,180,90,1)", "rgba(220,110,40,0.55)"] as const,
  ]) {
    const g = e.createRadialGradient(pit.x, pit.y, 0, pit.x, pit.y, 46);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    e.fillStyle = g;
    e.beginPath();
    e.arc(pit.x, pit.y, 46, 0, Math.PI * 2);
    e.fill();
  }
  e.restore();

  // ---------- HEIGHT (gentle: jungle a touch high, lanes/river slightly carved) ----------
  const [heightCanvas, h] = makeCanvas();
  h.fillStyle = "rgb(40,40,40)"; // out of bounds slightly low
  h.fillRect(0, 0, SIZE, SIZE);
  h.save();
  clipPlayable(h);
  for (let y = 0; y < SIZE; y += 6) {
    for (let x = 0; x < SIZE; x += 6) {
      const n = smoothNoise(x, y, 64) * 0.6 + smoothNoise(x, y, 22) * 0.4;
      const v = Math.round(150 + n * 50);
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.fillRect(x, y, 6, 6);
    }
  }
  // carve river
  h.save();
  h.strokeStyle = "rgb(96,96,96)";
  h.lineWidth = 56;
  h.lineCap = "round";
  riverPath(h);
  h.stroke();
  h.restore();
  // carve lanes + jungle paths a little
  h.save();
  h.strokeStyle = "rgb(120,120,120)";
  h.lineCap = "round";
  h.lineJoin = "round";
  for (const lane of ["top", "bot", "mid"] as const) {
    h.lineWidth = lane === "mid" ? 54 : 50;
    lanePath(h, lane);
    h.stroke();
  }
  h.lineWidth = 16;
  for (const path of JPATHS) {
    polyline(h, path);
    h.stroke();
  }
  h.restore();
  // base platforms (a touch raised)
  for (const base of [BLUE, RED]) {
    const g = h.createRadialGradient(base.x, base.y, 0, base.x, base.y, BS);
    g.addColorStop(0, "rgba(225,225,225,0.85)");
    g.addColorStop(1, "rgba(150,150,150,0)");
    h.fillStyle = g;
    h.beginPath();
    h.arc(base.x, base.y, BS, 0, Math.PI * 2);
    h.fill();
  }
  h.restore();

  // ---------- POSTER ----------
  const [posterCanvas, pc] = makeCanvas();
  pc.drawImage(albedoCanvas, 0, 0);
  pc.globalCompositeOperation = "screen";
  pc.drawImage(emissiveCanvas, 0, 0);
  pc.globalCompositeOperation = "source-over";
  const vg = pc.createRadialGradient(C, C, SIZE * 0.2, C, C, SIZE * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, p.vignette);
  pc.fillStyle = vg;
  pc.fillRect(0, 0, SIZE, SIZE);

  const result = { albedoCanvas, emissiveCanvas, heightCanvas, posterDataUrl: posterCanvas.toDataURL("image/jpeg", 0.82) };
  cache.set(key, result);
  return result;
}
