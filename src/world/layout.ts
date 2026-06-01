/**
 * Pure, deterministic description of a single cell's geometry. No Three.js here —
 * just numbers derived from (worldSeed, cellCoords). Chunk.ts turns this into meshes.
 *
 * Connectivity trick: walls on an edge SHARED by two cells are decided by the edge's
 * own PRNG (keyed by both cells, see hashEdge), so neighbouring cells independently
 * agree on exactly where the doorways are — seams always line up, in any load order.
 * Each cell only *builds* its west and north edges; its east/south edges are built by
 * the neighbouring cells, so no wall is ever drawn twice.
 */

import { mulberry32, hashCoords, hashEdge } from "../core/prng";
import type { Environment } from "./Environment";

/** Axis-aligned wall centreline (either x1===x2 or z1===z2). */
export interface WallSeg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned bounding box in the XZ plane (walls span full height). */
export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CellLayout {
  cx: number;
  cz: number;
  walls: WallSeg[];
  pillars: Vec2[];
  light: Vec2 | null;
}

/**
 * Which sub-segments of an edge are OPEN (doorway) vs wall. Both cells sharing the
 * edge call this with the same pair and get the same array. Always leaves at least
 * one opening so the world never seals a cell off.
 */
function edgeOpenness(
  worldSeed: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  subGrid: number,
  openingChance: number,
): boolean[] {
  const rng = mulberry32(hashEdge(worldSeed, ax, az, bx, bz));
  const open: boolean[] = new Array(subGrid);
  let any = false;
  for (let i = 0; i < subGrid; i++) {
    open[i] = rng() < openingChance;
    if (open[i]) any = true;
  }
  if (!any) open[Math.floor(rng() * subGrid) % subGrid] = true;
  return open;
}

/** Build the wall pieces for one shared edge into `walls`. */
function addEdgeWalls(
  walls: WallSeg[],
  env: Environment,
  worldSeed: number,
  cx: number,
  cz: number,
  nx: number,
  nz: number,
  vertical: boolean,
  base: number, // x of the edge if vertical, z of the edge if horizontal
  origin: number, // z0 if vertical, x0 if horizontal
  step: number,
): void {
  const { subGrid, openingChance } = env.rules;
  const open = edgeOpenness(worldSeed, cx, cz, nx, nz, subGrid, openingChance);
  for (let i = 0; i < subGrid; i++) {
    if (open[i]) continue;
    const a = origin + i * step;
    const b = origin + (i + 1) * step;
    if (vertical) {
      walls.push({ x1: base, z1: a, x2: base, z2: b });
    } else {
      walls.push({ x1: a, z1: base, x2: b, z2: base });
    }
  }
}

/** Generate the full deterministic layout for cell (cx, cz). */
export function generateCell(
  env: Environment,
  worldSeed: number,
  cx: number,
  cz: number,
): CellLayout {
  const { cellSize, subGrid, interiorWallChance, pillarChance, lightChance } =
    env.rules;
  const rng = mulberry32(hashCoords(worldSeed, cx, cz));
  const x0 = cx * cellSize;
  const z0 = cz * cellSize;
  const step = cellSize / subGrid;

  const walls: WallSeg[] = [];

  // Shared perimeter: only build west (x = x0) and north (z = z0); the east and
  // south sides belong to the neighbouring cells.
  addEdgeWalls(walls, env, worldSeed, cx, cz, cx - 1, cz, true, x0, z0, step);
  addEdgeWalls(walls, env, worldSeed, cx, cz, cx, cz - 1, false, z0, x0, step);

  // Interior partitions on the sub-grid create the un-mappable maze.
  for (let g = 1; g < subGrid; g++) {
    const gx = x0 + g * step;
    const gz = z0 + g * step;
    for (let s = 0; s < subGrid; s++) {
      // Vertical interior segment at gx, spanning one sub-cell along z.
      if (rng() < interiorWallChance) {
        const a = z0 + s * step;
        walls.push({ x1: gx, z1: a, x2: gx, z2: a + step });
      }
      // Horizontal interior segment at gz, spanning one sub-cell along x.
      if (rng() < interiorWallChance) {
        const a = x0 + s * step;
        walls.push({ x1: a, z1: gz, x2: a + step, z2: gz });
      }
    }
  }

  // Pillars at interior grid nodes.
  const pillars: Vec2[] = [];
  for (let gxi = 1; gxi < subGrid; gxi++) {
    for (let gzi = 1; gzi < subGrid; gzi++) {
      if (rng() < pillarChance) {
        pillars.push({ x: x0 + gxi * step, z: z0 + gzi * step });
      }
    }
  }

  // One ceiling light, centred, present most of the time.
  const light: Vec2 | null =
    rng() < lightChance ? { x: x0 + cellSize / 2, z: z0 + cellSize / 2 } : null;

  return { cx, cz, walls, pillars, light };
}

/** Collision boxes for a cell layout (walls + pillars), in world space. */
export function cellColliders(env: Environment, layout: CellLayout): Aabb[] {
  const t = env.rules.wallThickness / 2;
  const boxes: Aabb[] = [];
  for (const w of layout.walls) {
    if (w.x1 === w.x2) {
      // vertical (spans z)
      boxes.push({
        minX: w.x1 - t,
        maxX: w.x1 + t,
        minZ: Math.min(w.z1, w.z2),
        maxZ: Math.max(w.z1, w.z2),
      });
    } else {
      // horizontal (spans x)
      boxes.push({
        minX: Math.min(w.x1, w.x2),
        maxX: Math.max(w.x1, w.x2),
        minZ: w.z1 - t,
        maxZ: w.z1 + t,
      });
    }
  }
  const ph = 0.25; // pillar half-size
  for (const p of layout.pillars) {
    boxes.push({ minX: p.x - ph, maxX: p.x + ph, minZ: p.z - ph, maxZ: p.z + ph });
  }
  return boxes;
}
