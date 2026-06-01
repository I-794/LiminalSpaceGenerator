/**
 * App entry point. Wires the deterministic world (seed -> PRNG -> chunks) to the
 * renderer, first-person controls, flickering lights, and post-processing, then
 * runs the frame loop. Everything downstream of `worldSeed` is reproducible.
 *
 * The selected environment lives in the URL too (`?env=`), so a shared link
 * reproduces both the exact layout and the level it was generated in.
 */

import {
  Clock,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Material,
} from "three";
import { xmur3 } from "./core/prng";
import {
  getOrCreateSeed,
  newRandomSeed,
  getEnvFromUrl,
  setEnvInUrl,
} from "./core/seed";
import {
  ENVIRONMENTS,
  getEnvById,
  type Environment,
} from "./world/Environment";
import { ChunkManager } from "./world/ChunkManager";
import type { ChunkMaterials } from "./world/Chunk";
import { createTextureSet } from "./textures/procedural";
import { applyMood, createStage, handleResize } from "./render/Renderer";
import { FlickerLights } from "./render/lights";
import { createComposer } from "./render/postprocessing";
import { FirstPersonControls } from "./controls/FirstPersonControls";
import { EntityManager } from "./entities/EntityManager";
import { playSting } from "./entities/sting";
import { createOverlay, isTouchDevice, showTouchBlock } from "./ui/overlay";

// Pointer lock is impossible on touch devices — show the desktop-only notice and stop.
if (isTouchDevice()) {
  showTouchBlock();
} else {
  start();
}

interface MaterialBundle {
  materials: ChunkMaterials;
  dispose: () => void;
}

function buildMaterials(env: Environment): MaterialBundle {
  const tex = createTextureSet(env);
  const wet = env.style === "poolrooms";
  const wall = new MeshStandardMaterial({ map: tex.wallpaper, roughness: 0.95, metalness: 0 });
  // Water gets a lower roughness so the lights leave a wet specular sheen.
  const floor = new MeshStandardMaterial({
    map: tex.carpet,
    roughness: wet ? 0.35 : 1,
    metalness: 0,
  });
  const ceiling = new MeshStandardMaterial({ map: tex.ceiling, roughness: 0.9, metalness: 0 });
  // Unlit, always-bright glowing fluorescent panel.
  const panel = new MeshBasicMaterial({ color: env.palette.fixture });
  const all: Material[] = [wall, floor, ceiling, panel];
  return {
    materials: { wall, floor, ceiling, panel },
    dispose: () => {
      all.forEach((m) => m.dispose());
      tex.dispose();
    },
  };
}

function start(): void {
  let env = getEnvById(getEnvFromUrl());
  let seed = getOrCreateSeed();
  let worldSeed = xmur3(seed);
  setEnvInUrl(env.id); // persist even when defaulted, so the first link is complete

  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const stage = createStage(canvas, env);
  let matBundle = buildMaterials(env);

  const world = new ChunkManager(stage.scene, env, worldSeed, matBundle.materials);
  let lights = new FlickerLights(stage.scene, env.mood);
  const composer = createComposer(stage.renderer, stage.scene, stage.camera);
  const controls = new FirstPersonControls(stage.camera, canvas);

  // Spawn at a sub-cell centre (not a grid node, where wall segments can meet).
  const spawn = (): void =>
    controls.setPosition(env.rules.cellSize * 0.375, 1.6, env.rules.cellSize * 0.375);
  spawn();
  world.update(controls.position);

  // Hostile entities. They only move while the pointer is locked, and freeze
  // during a catch (caught = true) until the respawn completes.
  let audio: AudioContext | null = null;
  let caught = false;
  const entities = new EntityManager(
    stage.scene,
    (p) => world.getColliders(p),
    () => onCaught(),
  );
  entities.reset(controls.position);

  function onCaught(): void {
    if (caught) return;
    caught = true;
    overlay.showJumpscare();
    if (audio) playSting(audio);
    window.setTimeout(() => {
      // Caught -> dropped into a brand new space (new seed), entities reset.
      seed = newRandomSeed();
      worldSeed = xmur3(seed);
      world.reseed(worldSeed);
      spawn();
      world.update(controls.position);
      entities.reset(controls.position);
      overlay.setSeed(seed);
      overlay.hideJumpscare();
      caught = false;
    }, 1050);
  }

  const overlay = createOverlay({
    onEnter: () => {
      // Create/resume the audio context from this user gesture so the catch
      // sting can play later.
      if (!audio) audio = new AudioContext();
      void audio.resume();
      controls.lock.lock();
    },
    onNewSpace: () => {
      seed = newRandomSeed();
      worldSeed = xmur3(seed);
      world.reseed(worldSeed);
      spawn();
      world.update(controls.position);
      entities.reset(controls.position);
      overlay.setSeed(seed);
      overlay.toast("New space generated");
    },
    onSwitchEnv: () => {
      const next = ENVIRONMENTS[(ENVIRONMENTS.indexOf(env) + 1) % ENVIRONMENTS.length];
      applyEnvironment(next);
      overlay.toast(`Entered ${next.name}`);
    },
    onCopyLink: () => {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => overlay.toast("Link copied"))
        .catch(() => overlay.toast("Copy failed"));
    },
  });
  overlay.setSeed(seed);
  overlay.setEnvName(env.name);
  overlay.showStart();

  /** Swap the active environment: new textures, materials, fog, lights, and world. */
  function applyEnvironment(next: Environment): void {
    env = next;
    setEnvInUrl(env.id);

    matBundle.dispose();
    matBundle = buildMaterials(env);
    world.setEnv(env, matBundle.materials);
    applyMood(stage, env);

    lights.dispose();
    lights = new FlickerLights(stage.scene, env.mood);

    spawn();
    world.update(controls.position);
    entities.reset(controls.position);
    overlay.setEnvName(env.name);
  }

  controls.lock.addEventListener("lock", () => overlay.hideOverlays());
  controls.lock.addEventListener("unlock", () => overlay.showPaused());

  handleResize(stage, (w, h) => composer.setSize(w, h));

  const clock = new Clock();
  function frame(): void {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    const colliders = world.getColliders(controls.position);
    controls.update(dt, colliders);
    world.update(controls.position);
    // Entities hunt only while you're actually in the space (locked) and not
    // mid-catch.
    if (controls.isLocked && !caught) entities.update(dt, controls.position);
    lights.update(controls.position, world.fixtures, elapsed);
    composer.render(dt);
  }
  frame();
}
