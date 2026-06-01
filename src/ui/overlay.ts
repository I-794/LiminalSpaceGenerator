/**
 * Thin DOM wiring for the in-experience UI: seed readout, New Space / Copy Link
 * buttons, the click-to-enter / paused gates, and the desktop-only notice.
 * All game logic stays out of here — this just exposes events to main.ts.
 */

export interface OverlayHandlers {
  onEnter: () => void;
  onNewSpace: () => void;
  onCopyLink: () => void;
  onSwitchEnv: () => void;
}

export interface Overlay {
  setSeed: (seed: string) => void;
  setEnvName: (name: string) => void;
  showStart: () => void;
  showPaused: () => void;
  hideOverlays: () => void;
  showJumpscare: () => void;
  hideJumpscare: () => void;
  toast: (msg: string) => void;
}

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

/** True for touch / coarse-pointer devices where pointer lock won't work. */
export function isTouchDevice(): boolean {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const noHover = window.matchMedia?.("(hover: none)").matches ?? false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return touch && (coarse || noHover);
}

export function showTouchBlock(): void {
  $("touch-block").hidden = false;
  $("start").hidden = true;
}

export function createOverlay(handlers: OverlayHandlers): Overlay {
  const hud = $<HTMLDivElement>("hud");
  const seedValue = $<HTMLSpanElement>("seed-value");
  const envValue = $<HTMLSpanElement>("env-value");
  const startEl = $<HTMLDivElement>("start");
  const pausedEl = $<HTMLDivElement>("paused");
  const jumpscareEl = $<HTMLDivElement>("jumpscare");

  $("btn-enter").addEventListener("click", handlers.onEnter);
  $("btn-resume").addEventListener("click", handlers.onEnter);
  $("btn-new").addEventListener("click", handlers.onNewSpace);
  $("btn-copy").addEventListener("click", handlers.onCopyLink);
  $("btn-env").addEventListener("click", handlers.onSwitchEnv);

  let toastEl: HTMLDivElement | null = null;
  let toastTimer = 0;

  return {
    setSeed(seed: string): void {
      seedValue.textContent = seed;
    },
    setEnvName(name: string): void {
      envValue.textContent = name;
    },
    showStart(): void {
      startEl.hidden = false;
      pausedEl.hidden = true;
    },
    showPaused(): void {
      pausedEl.hidden = false;
      startEl.hidden = true;
    },
    hideOverlays(): void {
      startEl.hidden = true;
      pausedEl.hidden = true;
      hud.hidden = false;
    },
    showJumpscare(): void {
      jumpscareEl.hidden = false;
      void jumpscareEl.offsetWidth; // restart the animation
      jumpscareEl.classList.add("show");
    },
    hideJumpscare(): void {
      jumpscareEl.classList.remove("show");
      jumpscareEl.hidden = true;
    },
    toast(msg: string): void {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "toast";
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      // reflow so re-triggering restarts the transition
      void toastEl.offsetWidth;
      toastEl.classList.add("show");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl?.classList.remove("show"), 1400);
    },
  };
}
