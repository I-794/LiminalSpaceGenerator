/**
 * Seed <-> URL plumbing. The seed lives in `?seed=` so any space is shareable
 * and reproducible. On first load with no seed, we generate one and write it to
 * the URL (via replaceState) so even the very first space has a permalink.
 */

const ADJECTIVES = [
  "damp", "humming", "vacant", "endless", "sallow", "stale", "buzzing",
  "forgotten", "amber", "quiet", "fluorescent", "soft", "yellowed", "hollow",
  "dim", "patient", "warm", "carpeted", "low", "off",
];
const NOUNS = [
  "corridor", "lobby", "annex", "hallway", "atrium", "ward", "wing", "vestibule",
  "office", "landing", "mezzanine", "stairwell", "alcove", "concourse", "room",
  "level", "floor", "lounge", "passage", "threshold",
];

/** A readable, shareable seed like "damp-corridor-4817". */
function randomSeedString(): string {
  const r = () => Math.floor(Math.random() * 1e9); // UI-only randomness, not world content
  const a = ADJECTIVES[r() % ADJECTIVES.length];
  const n = NOUNS[r() % NOUNS.length];
  const num = r() % 10000;
  return `${a}-${n}-${String(num).padStart(4, "0")}`;
}

/** Read the seed from the URL, or mint+persist a new one if absent/blank. */
export function getOrCreateSeed(): string {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get("seed");
  if (existing && existing.trim().length > 0) return existing.trim();

  const seed = randomSeedString();
  setSeedInUrl(seed);
  return seed;
}

/** Write a seed into the URL without adding a history entry. */
export function setSeedInUrl(seed: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", seed);
  window.history.replaceState({}, "", url.toString());
}

/** Mint a fresh random seed and persist it to the URL. */
export function newRandomSeed(): string {
  const seed = randomSeedString();
  setSeedInUrl(seed);
  return seed;
}

/** Read the `?env=` environment id from the URL (or null if absent). */
export function getEnvFromUrl(): string | null {
  return new URL(window.location.href).searchParams.get("env");
}

/** Persist the environment id to the URL so the link reproduces the same level. */
export function setEnvInUrl(id: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("env", id);
  window.history.replaceState({}, "", url.toString());
}
