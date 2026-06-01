/**
 * First-person movement. Mouse-look + pointer lock come from three's
 * PointerLockControls (which only touches the camera's ROTATION); we own the
 * camera POSITION entirely — walking, wall collision, and a subtle walk-bob.
 *
 * Collision is circle-vs-AABB, resolved on the X and Z axes separately so the
 * player slides along walls instead of sticking.
 */

import { Euler, type PerspectiveCamera, Vector3 } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import type { Aabb } from "../world/layout";

const PLAYER_RADIUS = 0.32;
const ACCEL = 60;
const MAX_SPEED = 3.2;
const DAMPING = 10;

export class FirstPersonControls {
  readonly lock: PointerLockControls;
  /** Feet/base position (camera = this + bob offset). */
  readonly position = new Vector3();
  private velocity = new Vector3();
  private keys = new Set<string>();
  private bobPhase = 0;

  constructor(
    private camera: PerspectiveCamera,
    domElement: HTMLElement,
  ) {
    this.lock = new PointerLockControls(camera, domElement);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  get isLocked(): boolean {
    return this.lock.isLocked;
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.bobPhase = 0;
    this.camera.position.copy(this.position);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private wishDir(out: Vector3): void {
    // Forward/right from the camera's yaw only (ignore pitch so looking up/down
    // doesn't slow you down).
    const e = new Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    const yaw = e.y;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let fz = 0;
    let rx = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) fz -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) fz += 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) rx += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) rx -= 1;
    // forward = (-sin, -cos) in XZ; right = (cos, -sin)
    out.set(-sin * fz + cos * rx, 0, -cos * fz - sin * rx);
    if (out.lengthSq() > 0) out.normalize();
  }

  private collideAxis(
    nextX: number,
    nextZ: number,
    colliders: Aabb[],
  ): { x: number; z: number } {
    const r = PLAYER_RADIUS;
    let x = nextX;
    let z = nextZ;
    for (const b of colliders) {
      // Expanded box (Minkowski) — treat player as a point against a fattened AABB.
      if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) {
        // Push out along the least-penetrating axis.
        const dxL = x - (b.minX - r);
        const dxR = b.maxX + r - x;
        const dzL = z - (b.minZ - r);
        const dzR = b.maxZ + r - z;
        const minPen = Math.min(dxL, dxR, dzL, dzR);
        if (minPen === dxL) x = b.minX - r;
        else if (minPen === dxR) x = b.maxX + r;
        else if (minPen === dzL) z = b.minZ - r;
        else z = b.maxZ + r;
      }
    }
    return { x, z };
  }

  update(dt: number, colliders: Aabb[]): void {
    const wish = new Vector3();
    if (this.isLocked) this.wishDir(wish);

    // Accelerate toward the wish direction, damp otherwise.
    this.velocity.x += wish.x * ACCEL * dt;
    this.velocity.z += wish.z * ACCEL * dt;
    const damp = Math.max(0, 1 - DAMPING * dt);
    this.velocity.x *= damp;
    this.velocity.z *= damp;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > MAX_SPEED) {
      const k = MAX_SPEED / speed;
      this.velocity.x *= k;
      this.velocity.z *= k;
    }

    // Move with per-axis collision so we slide along walls.
    let nx = this.position.x + this.velocity.x * dt;
    let nz = this.position.z + this.velocity.z * dt;
    ({ x: nx, z: nz } = this.collideAxis(nx, this.position.z, colliders));
    ({ x: nx, z: nz } = this.collideAxis(nx, nz, colliders));
    this.position.x = nx;
    this.position.z = nz;

    // Walk-bob: advance phase by distance travelled, fade out when nearly still.
    const moving = Math.hypot(this.velocity.x, this.velocity.z);
    this.bobPhase += moving * dt * 2.2;
    const intensity = Math.min(moving / MAX_SPEED, 1);
    const bobY = Math.sin(this.bobPhase * 2) * 0.045 * intensity;
    const sway = Math.cos(this.bobPhase) * 0.02 * intensity;

    // Apply position to the camera, plus bob. Lateral sway is along camera-right.
    const e = new Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    const rightX = Math.cos(e.y);
    const rightZ = -Math.sin(e.y);
    this.camera.position.set(
      this.position.x + rightX * sway,
      this.position.y + bobY,
      this.position.z + rightZ * sway,
    );
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.lock.dispose();
  }
}
