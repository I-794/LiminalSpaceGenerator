/**
 * Hostile entities. Tall, near-black figures that wander the halls and, once they
 * sense the player, turn and hunt. Touch the player and they trigger a catch
 * (handled by the caller: jumpscare + respawn at a new seed).
 *
 * Unlike the world, entities are LIVE agents — their motion is real-time, not
 * derived from the seed. The world layout stays perfectly reproducible; the
 * entities are the danger layered on top. They move with the same collision data
 * as the player, so they cannot walk through walls.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Scene,
} from "three";
import type { Aabb } from "../world/layout";

const COUNT = 3;
const ENTITY_RADIUS = 0.4;
const SENSE = 15; // start hunting within this distance
const HUNT_SPEED = 2.9; // player tops out at 3.2 — barely outrunnable in a straight line
const WANDER_SPEED = 1.0;
const CATCH = 1.2;
const DESPAWN = 38;
const SPAWN_MIN = 19;
const SPAWN_MAX = 30;
const TAU = Math.PI * 2;

type ColliderFn = (pos: Vector3) => Aabb[];

interface Entity {
  group: Group;
  pos: Vector3;
  heading: number;
  repath: number;
  phase: number;
  hunting: boolean;
}

/** Push a point out of any wall box it overlaps, one axis at a time (slide). */
function collideAxis(x: number, z: number, boxes: Aabb[], r: number): { x: number; z: number } {
  for (const b of boxes) {
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) {
      const dxL = x - (b.minX - r);
      const dxR = b.maxX + r - x;
      const dzL = z - (b.minZ - r);
      const dzR = b.maxZ + r - z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) x = b.minX - r;
      else if (m === dxR) x = b.maxX + r;
      else if (m === dzL) z = b.minZ - r;
      else z = b.maxZ + r;
    }
  }
  return { x, z };
}

export class EntityManager {
  private entities: Entity[] = [];
  private scratch = new Vector3();
  // Shared resources across all figures.
  private bodyGeo = new CylinderGeometry(0.14, 0.26, 1.7, 6);
  private headGeo = new SphereGeometry(0.17, 8, 6);
  private eyeGeo = new SphereGeometry(0.028, 6, 5);
  private darkMat = new MeshStandardMaterial({ color: 0x070706, roughness: 1, metalness: 0 });
  private eyeMat = new MeshBasicMaterial({ color: 0xf4ead0 });

  constructor(
    private scene: Scene,
    private getColliders: ColliderFn,
    private onCaught: () => void,
  ) {
    for (let i = 0; i < COUNT; i++) {
      const e: Entity = {
        group: this.makeFigure(),
        pos: new Vector3(9999, 0, 9999),
        heading: 0,
        repath: 0,
        phase: i,
        hunting: false,
      };
      this.scene.add(e.group);
      this.entities.push(e);
    }
  }

  private makeFigure(): Group {
    const g = new Group();
    const body = new Mesh(this.bodyGeo, this.darkMat);
    body.position.y = 0.85;
    const head = new Mesh(this.headGeo, this.darkMat);
    head.position.y = 1.8;
    const eyeL = new Mesh(this.eyeGeo, this.eyeMat);
    eyeL.position.set(-0.06, 1.82, 0.15);
    const eyeR = new Mesh(this.eyeGeo, this.eyeMat);
    eyeR.position.set(0.06, 1.82, 0.15);
    g.add(body, head, eyeL, eyeR);
    return g;
  }

  /** Place one entity at a random walkable point ringed around the player. */
  private place(e: Entity, playerPos: Vector3): void {
    for (let tries = 0; tries < 8; tries++) {
      const ang = Math.random() * TAU;
      const dist = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      const x = playerPos.x + Math.sin(ang) * dist;
      const z = playerPos.z + Math.cos(ang) * dist;
      this.scratch.set(x, 0, z);
      const boxes = this.getColliders(this.scratch);
      const clear = collideAxis(x, z, boxes, ENTITY_RADIUS);
      if (Math.hypot(clear.x - x, clear.z - z) < 0.01) {
        e.pos.set(x, 0, z);
        break;
      }
      if (tries === 7) e.pos.set(x, 0, z); // give up; collision will nudge it out
    }
    e.heading = Math.random() * TAU;
    e.repath = 0;
    e.hunting = false;
    e.group.position.copy(e.pos);
  }

  /** Reposition every entity (used on spawn, new seed, environment switch, respawn). */
  reset(playerPos: Vector3): void {
    for (const e of this.entities) this.place(e, playerPos);
  }

  update(dt: number, playerPos: Vector3): void {
    for (const e of this.entities) {
      const dx = playerPos.x - e.pos.x;
      const dz = playerPos.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1e-6;

      if (d < CATCH) {
        this.onCaught();
        return;
      }
      if (d > DESPAWN) {
        this.place(e, playerPos);
        continue;
      }

      e.hunting = d < SENSE;
      let dirX: number;
      let dirZ: number;
      if (e.hunting) {
        dirX = dx / d;
        dirZ = dz / d;
      } else {
        e.repath -= dt;
        if (e.repath <= 0) {
          e.heading = Math.random() * TAU;
          e.repath = 2 + Math.random() * 3;
        }
        dirX = Math.sin(e.heading);
        dirZ = Math.cos(e.heading);
      }

      const speed = e.hunting ? HUNT_SPEED : WANDER_SPEED;
      const tx = e.pos.x + dirX * speed * dt;
      const tz = e.pos.z + dirZ * speed * dt;
      this.scratch.set(e.pos.x, 0, e.pos.z);
      const boxes = this.getColliders(this.scratch);
      let p = collideAxis(tx, e.pos.z, boxes, ENTITY_RADIUS);
      p = collideAxis(p.x, tz, boxes, ENTITY_RADIUS);

      // If a wanderer barely moved, it hit a wall — pick a new heading next frame.
      if (!e.hunting && Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < speed * dt * 0.3) {
        e.repath = 0;
      }
      e.pos.x = p.x;
      e.pos.z = p.z;

      // Face the player; add a faint stalking bob.
      e.phase += dt * 4;
      e.group.position.set(e.pos.x, Math.abs(Math.sin(e.phase)) * 0.04, e.pos.z);
      e.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  dispose(): void {
    for (const e of this.entities) this.scene.remove(e.group);
    this.entities = [];
    this.bodyGeo.dispose();
    this.headGeo.dispose();
    this.eyeGeo.dispose();
    this.darkMat.dispose();
    this.eyeMat.dispose();
  }
}
