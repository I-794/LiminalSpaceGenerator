/**
 * Fluorescent lighting. Three.js can't afford a real light per fixture, so we keep
 * a small POOL of point lights and, each frame, snap them to the nearest fixtures
 * around the player. Each gets a sickly yellow-green cast plus a seeded flicker —
 * the buzzing, occasionally-failing tube look. Distant fixtures still read because
 * their glowing emissive panel is baked into the mesh; the fog hides the rest.
 */

import { AmbientLight, PointLight, Scene, Vector3 } from "three";
import type { Mood } from "../world/Environment";
import type { Fixture } from "../world/Chunk";

const POOL_SIZE = 7;

/** Per-fixture flicker in [0,1]; stable for a given fixture, varies over time. */
function flicker(seedPhase: number, t: number): number {
  // Steady mains buzz...
  let v = 0.86 + 0.14 * Math.sin(t * 28 + seedPhase);
  // ...with occasional dropouts where the tube nearly cuts out.
  const drop = Math.sin(t * 6.3 + seedPhase * 1.7) * Math.sin(t * 2.1 + seedPhase);
  if (drop > 0.82) v *= 0.18;
  else if (drop > 0.7) v *= 0.6;
  return v;
}

export class FlickerLights {
  private pool: PointLight[] = [];
  private ambient: AmbientLight;
  private tmp = new Vector3();

  constructor(private scene: Scene, private mood: Mood) {
    this.ambient = new AmbientLight(mood.ambient, mood.ambientIntensity);
    scene.add(this.ambient);
    for (let i = 0; i < POOL_SIZE; i++) {
      const l = new PointLight(mood.lightColor, 0, 14, 1.6);
      l.visible = false;
      scene.add(l);
      this.pool.push(l);
    }
  }

  /** Remove all lights from the scene (used when switching environments). */
  dispose(): void {
    this.scene.remove(this.ambient);
    for (const l of this.pool) this.scene.remove(l);
    this.pool = [];
  }

  update(playerPos: Vector3, fixtures: Fixture[], time: number): void {
    // Find the POOL_SIZE nearest fixtures (small N, cheap partial selection).
    const nearest = fixtures
      .map((f) => {
        this.tmp.set(f.x, f.y, f.z);
        return { f, d: this.tmp.distanceToSquared(playerPos) };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, POOL_SIZE);

    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i];
      const hit = nearest[i];
      if (!hit) {
        l.visible = false;
        continue;
      }
      const f = hit.f;
      l.visible = true;
      l.position.set(f.x, f.y, f.z);
      const phase = (f.x * 12.9898 + f.z * 78.233) % (Math.PI * 2);
      l.intensity = this.mood.lightIntensity * flicker(phase, time);
    }
  }
}
