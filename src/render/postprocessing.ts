/**
 * Post-processing stack (pmndrs `postprocessing`): film grain, a slight chromatic
 * aberration at the edges, and a faint vignette. All three are merged into a single
 * EffectPass so it's one extra fullscreen draw, not three.
 */

import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import {
  BlendFunction,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  VignetteEffect,
} from "postprocessing";

export interface Composer {
  render: (dt: number) => void;
  setSize: (w: number, h: number) => void;
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
): Composer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const chroma = new ChromaticAberrationEffect({
    offset: new Vector2(0.0009, 0.0009),
    radialModulation: true,
    modulationOffset: 0.3,
  });

  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
  // NoiseEffect re-randomises every frame -> film grain. Keep it subtle.
  grain.blendMode.opacity.value = 0.22;

  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.72 });

  composer.addPass(new EffectPass(camera, chroma, grain, vignette));

  return {
    render: (dt: number) => composer.render(dt),
    setSize: (w: number, h: number) => composer.setSize(w, h),
  };
}
