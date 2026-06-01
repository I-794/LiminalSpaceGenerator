/**
 * Turns a CellLayout into Three.js meshes. To keep draw calls low, all of a cell's
 * walls + pillars are merged into ONE geometry (wallpaper material); floor, ceiling,
 * and the glowing light panel are one mesh each. So a cell is ~3–4 draw calls.
 *
 * UVs are baked from WORLD position (see bakeWorldUVs) so textures tile seamlessly
 * across cell boundaries instead of stretching per face.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  PlaneGeometry,
  type Material,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Environment } from "./Environment";
import { cellColliders, type Aabb, type CellLayout, type Vec2 } from "./layout";

export interface ChunkMaterials {
  wall: Material;
  floor: Material;
  ceiling: Material;
  panel: Material;
}

export interface Fixture {
  x: number;
  y: number;
  z: number;
}

export interface BuiltChunk {
  group: Group;
  colliders: Aabb[];
  fixtures: Fixture[];
  dispose: () => void;
}

const WALL_UV_SCALE = 2;
const FLOOR_UV_SCALE = 3;

/**
 * Rewrite a geometry's UVs from world-space vertex positions, projected onto the
 * plane perpendicular to each vertex's dominant normal axis. Gives seamless tiling
 * for floors, ceilings, and both wall orientations with one helper.
 */
function bakeWorldUVs(geo: BufferGeometry, scale: number): void {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ny >= nx && ny >= nz) {
      u = x; // horizontal surface (floor/ceiling)
      v = z;
    } else if (nx >= nz) {
      u = z; // wall facing along X
      v = y;
    } else {
      u = x; // wall facing along Z
      v = y;
    }
    uv[i * 2] = u / scale;
    uv[i * 2 + 1] = v / scale;
  }
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
}

function wallBoxes(env: Environment, layout: CellLayout): BufferGeometry | null {
  const { wallHeight, wallThickness } = env.rules;
  const parts: BufferGeometry[] = [];

  for (const w of layout.walls) {
    let sx: number;
    let sz: number;
    let cx: number;
    let cz: number;
    if (w.x1 === w.x2) {
      const len = Math.abs(w.z2 - w.z1);
      sx = wallThickness;
      sz = len;
      cx = w.x1;
      cz = (w.z1 + w.z2) / 2;
    } else {
      const len = Math.abs(w.x2 - w.x1);
      sx = len;
      sz = wallThickness;
      cx = (w.x1 + w.x2) / 2;
      cz = w.z1;
    }
    const g = new BoxGeometry(sx, wallHeight, sz);
    g.translate(cx, wallHeight / 2, cz);
    parts.push(g);
  }

  const ph = 0.5;
  for (const p of layout.pillars) {
    const g = new BoxGeometry(ph, wallHeight, ph);
    g.translate(p.x, wallHeight / 2, p.z);
    parts.push(g);
  }

  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) return null;
  bakeWorldUVs(merged, WALL_UV_SCALE);
  return merged;
}

function floorGeo(env: Environment, layout: CellLayout): BufferGeometry {
  const s = env.rules.cellSize;
  const g = new PlaneGeometry(s, s);
  g.rotateX(-Math.PI / 2); // face up
  g.translate(layout.cx * s + s / 2, 0, layout.cz * s + s / 2);
  bakeWorldUVs(g, FLOOR_UV_SCALE);
  return g;
}

function ceilingGeo(env: Environment, layout: CellLayout): BufferGeometry {
  const s = env.rules.cellSize;
  const g = new PlaneGeometry(s, s);
  g.rotateX(Math.PI / 2); // face down
  g.translate(layout.cx * s + s / 2, env.rules.wallHeight, layout.cz * s + s / 2);
  bakeWorldUVs(g, FLOOR_UV_SCALE);
  return g;
}

/** Glowing fluorescent panel just below the ceiling, facing down. */
function panelGeo(env: Environment, light: Vec2): BufferGeometry {
  const g = new PlaneGeometry(1.6, 0.5);
  g.rotateX(Math.PI / 2); // face down
  g.translate(light.x, env.rules.wallHeight - 0.02, light.z);
  return g;
}

/** Build all meshes + collision + light data for a cell. */
export function buildChunk(
  env: Environment,
  layout: CellLayout,
  materials: ChunkMaterials,
): BuiltChunk {
  const group = new Group();
  const disposables: BufferGeometry[] = [];

  const walls = wallBoxes(env, layout);
  if (walls) {
    group.add(new Mesh(walls, materials.wall));
    disposables.push(walls);
  }

  const floor = floorGeo(env, layout);
  group.add(new Mesh(floor, materials.floor));
  disposables.push(floor);

  const ceiling = ceilingGeo(env, layout);
  group.add(new Mesh(ceiling, materials.ceiling));
  disposables.push(ceiling);

  const fixtures: Fixture[] = [];
  if (layout.light) {
    const panel = panelGeo(env, layout.light);
    group.add(new Mesh(panel, materials.panel));
    disposables.push(panel);
    fixtures.push({
      x: layout.light.x,
      y: env.rules.wallHeight - 0.1,
      z: layout.light.z,
    });
  }

  return {
    group,
    colliders: cellColliders(env, layout),
    fixtures,
    dispose() {
      disposables.forEach((g) => g.dispose());
    },
  };
}
