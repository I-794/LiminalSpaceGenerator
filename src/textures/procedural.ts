/**
 * Procedurally generated textures — drawn to a <canvas> and wrapped as
 * THREE.CanvasTexture. No copyrighted Backrooms imagery; the look is built from
 * scratch out of the environment's palette so it's original and CC0-clean.
 *
 * Textures are tileable and shared across every room (built once per environment),
 * which keeps memory and draw setup cheap.
 */

import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import { mulberry32 } from "../core/prng";
import type { Environment, Palette } from "../world/Environment";

export interface TextureSet {
  wallpaper: Texture;
  carpet: Texture;
  ceiling: Texture;
  dispose: () => void;
}

function makeCanvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function finish(canvas: HTMLCanvasElement, repeat: number): Texture {
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Mono-yellow wallpaper with a faint, slightly grimy repeating motif. */
function makeWallpaper(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0x9e3779b1);

  ctx.fillStyle = palette.wallpaper;
  ctx.fillRect(0, 0, S, S);

  // Faint vertical striping, like old patterned wallpaper.
  ctx.strokeStyle = palette.wallpaperPattern;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  for (let x = 0; x < S; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, S);
    ctx.stroke();
  }

  // A small repeating diamond/fleur motif on the grid.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = palette.wallpaperPattern;
  for (let y = 8; y < S; y += 32) {
    for (let x = 8; x < S; x += 32) {
      const r = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Grime / unevenness so it doesn't read as flat colour.
  ctx.globalAlpha = 1;
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 18;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 0.6;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Damp, blotchy carpet — noisy yellow with darker wet patches. */
function makeCarpet(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0x1b873593);

  ctx.fillStyle = palette.carpet;
  ctx.fillRect(0, 0, S, S);

  // Soft damp blotches.
  for (let i = 0; i < 26; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 12 + rng() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, palette.carpetDark);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.18 + rng() * 0.22;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Fine fibre noise.
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 30;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 0.5;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Drop-ceiling tiles with a slim grout grid. */
function makeCeiling(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0xcc9e2d51);

  ctx.fillStyle = palette.ceiling;
  ctx.fillRect(0, 0, S, S);

  // Tile grid (two tiles across the texture).
  ctx.strokeStyle = "rgba(60,55,20,0.55)";
  ctx.lineWidth = 3;
  for (const p of [0, S / 2, S]) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, S);
    ctx.moveTo(0, p);
    ctx.lineTo(S, p);
    ctx.stroke();
  }

  // Pinhole stipple in each tile, like acoustic ceiling panels.
  ctx.fillStyle = "rgba(50,46,18,0.4)";
  for (let i = 0; i < 900; i++) {
    const x = rng() * S;
    const y = rng() * S;
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

/** White pool tile with grout grid. */
function makeTileWall(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0x27d4eb2f);
  const tile = 32;

  ctx.fillStyle = palette.wallpaper;
  ctx.fillRect(0, 0, S, S);

  // Per-tile subtle shade variation.
  for (let y = 0; y < S; y += tile) {
    for (let x = 0; x < S; x += tile) {
      const n = (rng() - 0.5) * 14;
      ctx.fillStyle = `rgba(${n > 0 ? 255 : 0},${n > 0 ? 255 : 0},${n > 0 ? 255 : 0},${Math.abs(n) / 80})`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  // Grout lines.
  ctx.strokeStyle = palette.wallpaperPattern;
  ctx.lineWidth = 2;
  for (let p = 0; p <= S; p += tile) {
    ctx.beginPath();
    ctx.moveTo(p + 0.5, 0);
    ctx.lineTo(p + 0.5, S);
    ctx.moveTo(0, p + 0.5);
    ctx.lineTo(S, p + 0.5);
    ctx.stroke();
  }
  return c;
}

/** Shallow aqua water with soft caustic highlights. */
function makeWater(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0x165667b1);

  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, palette.carpet);
  g.addColorStop(1, palette.carpetDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // Wandering caustic ribbons.
  ctx.strokeStyle = palette.accent ?? "#cdeeea";
  ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.05 + rng() * 0.14;
    ctx.lineWidth = 1 + rng() * 2.5;
    ctx.beginPath();
    let x = rng() * S;
    let y = rng() * S;
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < segs; s++) {
      x += (rng() - 0.5) * 60;
      y += (rng() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Fine ripple noise.
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 16;
    d[i] += n * 0.5;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Pale concrete ceiling with faint panel seams. */
function makeConcrete(palette: Palette): HTMLCanvasElement {
  const S = 256;
  const { c, ctx } = makeCanvas(S);
  const rng = mulberry32(0x85ebca77);

  ctx.fillStyle = palette.ceiling;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 40; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const r = 20 + rng() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(120,120,110,0.08)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(90,90,82,0.35)";
  ctx.lineWidth = 2;
  for (const p of [0, S / 2, S]) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, S);
    ctx.moveTo(0, p);
    ctx.lineTo(S, p);
    ctx.stroke();
  }
  return c;
}

/** Build the full texture set for an environment (dispatched by surface style). */
export function createTextureSet(env: Environment): TextureSet {
  const p = env.palette;
  const wallpaper =
    env.style === "poolrooms" ? finish(makeTileWall(p), 1) : finish(makeWallpaper(p), 1);
  const carpet =
    env.style === "poolrooms" ? finish(makeWater(p), 1) : finish(makeCarpet(p), 2);
  const ceiling =
    env.style === "poolrooms" ? finish(makeConcrete(p), 1) : finish(makeCeiling(p), 1);
  return {
    wallpaper,
    carpet,
    ceiling,
    dispose() {
      wallpaper.dispose();
      carpet.dispose();
      ceiling.dispose();
    },
  };
}
