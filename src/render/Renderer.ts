/**
 * Renderer + scene + camera, with the exponential fog that limits view distance
 * and gives the space its claustrophobic, can't-see-far feel. The fog colour also
 * tints the background so the world dissolves into haze rather than a hard edge.
 */

import {
  ACESFilmicToneMapping,
  Color,
  FogExp2,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import type { Environment } from "../world/Environment";

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
}

export function createStage(canvas: HTMLCanvasElement, env: Environment): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new Scene();
  const camera = new PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.6, 0);

  const stage = { renderer, scene, camera };
  applyMood(stage, env);
  return stage;
}

/** Apply an environment's fog + background. Safe to call when switching levels. */
export function applyMood(stage: Stage, env: Environment): void {
  const color = new Color(env.mood.fogColor);
  const fog = stage.scene.fog;
  if (fog instanceof FogExp2) {
    fog.color.copy(color);
    fog.density = env.mood.fogDensity;
  } else {
    stage.scene.fog = new FogExp2(color.getHex(), env.mood.fogDensity);
  }
  stage.scene.background = color;
}

export function handleResize(stage: Stage, onResize?: (w: number, h: number) => void): void {
  const apply = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stage.camera.aspect = w / h;
    stage.camera.updateProjectionMatrix();
    stage.renderer.setSize(w, h);
    onResize?.(w, h);
  };
  window.addEventListener("resize", apply);
}
