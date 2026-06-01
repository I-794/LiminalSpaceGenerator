/**
 * Deterministic seeded randomness.
 *
 * The whole world is a pure function of (worldSeed, cellCoords). We never touch
 * `Math.random` for world content — every layout decision pulls from a PRNG
 * stream derived from these helpers, so the same seed reproduces the same space
 * exactly, across reloads and revisits, regardless of generation order.
 */

/** Hash a string into a 32-bit seed. xmur3 by Bryc (public domain). */
export function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 PRNG by Tommy Ettinger (public domain). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two 32-bit ints into one (a cheap, well-distributed integer hash). */
function mix2(a: number, b: number): number {
  let h = (a ^ Math.imul(b ^ (b >>> 16), 2246822507)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Derive an independent uint32 stream-seed for cell (cx, cz) from the world seed.
 * `mulberry32(hashCoords(seed, cx, cz))` gives that cell its own reproducible RNG.
 */
export function hashCoords(worldSeed: number, cx: number, cz: number): number {
  return mix2(mix2(worldSeed, cx | 0), cz | 0);
}

/**
 * Derive a seed for the *edge* shared by two adjacent cells. Cells are ordered
 * canonically (min→max) so both neighbours compute the SAME edge seed, which is
 * how doorways line up seamlessly no matter which cell generated first.
 */
export function hashEdge(
  worldSeed: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  // Order the two cells so the pair is canonical regardless of argument order.
  const swap = bx < ax || (bx === ax && bz < az);
  const [x1, z1, x2, z2] = swap ? [bx, bz, ax, az] : [ax, az, bx, bz];
  return mix2(mix2(mix2(worldSeed, x1), z1), mix2(x2, z2));
}
