import * as THREE from "three";

/**
 * Builds real 3D-terrain maps FROM Riot's official Summoner's Rift minimap:
 *  - color:  the minimap itself (albedo)
 *  - height: blurred luminance → gentle displacement (silhouette relief)
 *  - normal: a normal map derived from the luminance (Sobel) → this is what makes
 *            the flat image read as 3D, because the lighting now catches every
 *            wall, lane edge and structure on the map.
 * Loaded same-origin via /api/riftmap so the canvas isn't tainted.
 */
export interface RealRiftTextures {
  color: THREE.Texture;
  height: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function blur(src: Float32Array, n: number, radius: number): Float32Array {
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= n) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= n) continue;
          sum += src[yy * n + xx]!;
          cnt++;
        }
      }
      out[y * n + x] = sum / cnt;
    }
  }
  return out;
}

export async function buildRealRiftTextures(): Promise<RealRiftTextures> {
  const img = await loadImage("/api/riftmap");
  const N = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, N, N);

  // The current SR minimap encodes the WALLS / impassable terrain as TRANSPARENT pixels
  // (the swirly gaps); the opaque olive pixels are the walkable lanes, jungle floor and
  // river. So the wall mask is the minimap's ALPHA: transparent = wall = raised. Masked
  // to the playable rounded area so the transparent out-of-bounds corners stay flat.
  const alphaData = ctx.getImageData(0, 0, N, N).data;
  const alpha = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) alpha[i] = alphaData[i * 4 + 3]! / 255;

  const pmv = document.createElement("canvas");
  pmv.width = pmv.height = N;
  const pmx = pmv.getContext("2d")!;
  pmx.fillStyle = "#000";
  pmx.fillRect(0, 0, N, N);
  pmx.fillStyle = "#fff";
  const inset = N * 0.07, rad = N * 0.25, w = N - 2 * inset;
  pmx.beginPath();
  pmx.moveTo(inset + rad, inset);
  pmx.arcTo(inset + w, inset, inset + w, inset + w, rad);
  pmx.arcTo(inset + w, inset + w, inset, inset + w, rad);
  pmx.arcTo(inset, inset + w, inset, inset, rad);
  pmx.arcTo(inset, inset, inset + w, inset, rad);
  pmx.fill();
  const pd = pmx.getImageData(0, 0, N, N).data;
  const playRaw = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) playRaw[i] = pd[i * 4]! / 255;
  const play = blur(playRaw, N, 3);

  const wall = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) wall[i] = (1 - alpha[i]!) * play[i]!;

  // Build the COLOUR texture: a dark base, the opaque olive walkable terrain drawn over
  // it, then the (transparent) walls tinted toward dark forest green so they read as
  // raised relief. Out-of-bounds (transparent, wall≈0) stays the dark base and flat.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgb(16,24,18)";
  ctx.fillRect(0, 0, N, N);
  ctx.drawImage(img, 0, 0, N, N);
  const cd = ctx.getImageData(0, 0, N, N);
  const FG = [28, 54, 32];
  for (let i = 0; i < N * N; i++) {
    const g = wall[i]! * 0.9;
    if (g > 0.02) {
      cd.data[i * 4] = Math.round(cd.data[i * 4]! * (1 - g) + FG[0]! * g);
      cd.data[i * 4 + 1] = Math.round(cd.data[i * 4 + 1]! * (1 - g) + FG[1]! * g);
      cd.data[i * 4 + 2] = Math.round(cd.data[i * 4 + 2]! * (1 - g) + FG[2]! * g);
    }
    cd.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(cd, 0, 0);

  const hSmooth = blur(wall, N, 2); // for displacement (coarse)
  const hFine = blur(wall, N, 1); // for normals (crisper)

  // height canvas (grayscale)
  const hc = document.createElement("canvas");
  hc.width = hc.height = N;
  const hctx = hc.getContext("2d")!;
  const himg = hctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.round(hSmooth[i]! * 255);
    himg.data[i * 4] = himg.data[i * 4 + 1] = himg.data[i * 4 + 2] = v;
    himg.data[i * 4 + 3] = 255;
  }
  hctx.putImageData(himg, 0, 0);

  // normal map (Sobel on hFine)
  const nc = document.createElement("canvas");
  nc.width = nc.height = N;
  const nctx = nc.getContext("2d")!;
  const nimg = nctx.createImageData(N, N);
  const strength = 2.4;
  const at = (x: number, y: number) => hFine[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))]!;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) - at(x + 1, y - 1) - 2 * at(x + 1, y) - at(x + 1, y + 1);
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) - at(x - 1, y + 1) - 2 * at(x, y + 1) - at(x + 1, y + 1);
      let nx = dx * strength, ny = dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * N + x) * 4;
      nimg.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      nimg.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nimg.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  const color = new THREE.CanvasTexture(cv);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 8;
  const height = new THREE.CanvasTexture(hc);
  const normal = new THREE.CanvasTexture(nc);
  return { color, height, normal };
}
