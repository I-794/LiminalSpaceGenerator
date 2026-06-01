/**
 * Streams the world around the player: keeps every cell within a radius loaded and
 * disposes the rest, so wandering feels endless while draw calls stay bounded.
 * Cells are generated purely from (worldSeed, coords), so revisiting regenerates
 * an identical space.
 */

import { Scene, Vector3 } from "three";
import type { Environment } from "./Environment";
import { generateCell, type Aabb } from "./layout";
import { buildChunk, type ChunkMaterials, type Fixture } from "./Chunk";
import type { BuiltChunk } from "./Chunk";

const cellKey = (cx: number, cz: number): string => `${cx},${cz}`;

export class ChunkManager {
  private chunks = new Map<string, BuiltChunk>();
  private radius = 3;
  private lastCx = Number.NaN;
  private lastCz = Number.NaN;
  /** Aggregated light fixtures across all loaded chunks (rebuilt on change). */
  fixtures: Fixture[] = [];

  constructor(
    private scene: Scene,
    private env: Environment,
    private worldSeed: number,
    private materials: ChunkMaterials,
  ) {}

  private worldToCell(v: number): number {
    return Math.floor(v / this.env.rules.cellSize);
  }

  /** Load/despawn chunks so the player is always surrounded. Cheap when stationary. */
  update(playerPos: Vector3): void {
    const cx = this.worldToCell(playerPos.x);
    const cz = this.worldToCell(playerPos.z);
    if (cx === this.lastCx && cz === this.lastCz) return;
    this.lastCx = cx;
    this.lastCz = cz;

    const wanted = new Set<string>();
    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const kx = cx + dx;
        const kz = cz + dz;
        const key = cellKey(kx, kz);
        wanted.add(key);
        if (!this.chunks.has(key)) {
          const layout = generateCell(this.env, this.worldSeed, kx, kz);
          const built = buildChunk(this.env, layout, this.materials);
          this.scene.add(built.group);
          this.chunks.set(key, built);
        }
      }
    }

    // Despawn anything now out of range.
    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        this.scene.remove(chunk.group);
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    this.rebuildFixtures();
  }

  private rebuildFixtures(): void {
    this.fixtures = [];
    for (const chunk of this.chunks.values()) {
      this.fixtures.push(...chunk.fixtures);
    }
  }

  /** Wall/pillar boxes from the player's cell and its 8 neighbours (for collision). */
  getColliders(playerPos: Vector3): Aabb[] {
    const cx = this.worldToCell(playerPos.x);
    const cz = this.worldToCell(playerPos.z);
    const out: Aabb[] = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunks.get(cellKey(cx + dx, cz + dz));
        if (chunk) out.push(...chunk.colliders);
      }
    }
    return out;
  }

  /** Switch to a new environment + materials, clearing all loaded chunks. */
  setEnv(env: Environment, materials: ChunkMaterials): void {
    this.env = env;
    this.materials = materials;
    this.reseed(this.worldSeed);
  }

  /** Tear down every loaded chunk and rebuild from a new seed (New Space button). */
  reseed(worldSeed: number): void {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.group);
      chunk.dispose();
    }
    this.chunks.clear();
    this.worldSeed = worldSeed;
    this.lastCx = Number.NaN;
    this.lastCz = Number.NaN;
    this.fixtures = [];
  }

  dispose(): void {
    this.reseed(this.worldSeed);
  }
}
