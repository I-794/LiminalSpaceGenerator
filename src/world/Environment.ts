/**
 * An Environment bundles everything that makes one "level" look and generate the
 * way it does: a colour palette, the rules the room generator follows, and the
 * lighting/fog mood. The generator itself is environment-agnostic — adding
 * poolrooms, an office, a parking garage, etc. (stretch goals) means adding new
 * Environment objects here, not rewriting world generation.
 *
 * The MVP ships exactly one: LEVEL_0 yellowrooms.
 */

export interface Palette {
  /** Base wall colour (mono-yellow wallpaper / pool tile). */
  wallpaper: string;
  /** Secondary wall tone (wallpaper pattern / tile grout). */
  wallpaperPattern: string;
  /** Floor base (damp carpet / shallow water). */
  carpet: string;
  /** Darker floor tone (carpet blotches / deep water). */
  carpetDark: string;
  /** Ceiling colour (drop tile / pale concrete). */
  ceiling: string;
  /** Fluorescent fixture face / emissive panel colour. */
  fixture: string;
  /** Optional highlight (e.g. water caustics). */
  accent?: string;
}

/** Picks which family of procedural textures + surface materials a level uses. */
export type SurfaceStyle = "level0" | "poolrooms";

export interface RoomRules {
  /** Cell footprint in metres (one grid square of the world). */
  cellSize: number;
  /** Sub-grid resolution within a cell — finer = more intricate partitions. */
  subGrid: number;
  /** Ceiling height in metres (kept low for the oppressive feel). */
  wallHeight: number;
  /** Wall thickness in metres. */
  wallThickness: number;
  /** Chance an interior sub-grid wall segment exists. */
  interiorWallChance: number;
  /** Chance a perimeter edge between two cells has a doorway opening. */
  openingChance: number;
  /** Chance of a structural pillar at a sub-grid node. */
  pillarChance: number;
  /** Chance a cell hosts a ceiling light fixture. */
  lightChance: number;
}

/** Lighting + fog mood for the environment. */
export interface Mood {
  /** Exponential fog colour (sRGB hex int). */
  fogColor: number;
  /** Exponential fog density. Higher = can't see far. */
  fogDensity: number;
  /** Ambient fill colour. */
  ambient: number;
  ambientIntensity: number;
  /** Fluorescent point-light colour (sickly yellow-green). */
  lightColor: number;
  /** Base fluorescent intensity. */
  lightIntensity: number;
}

export interface Environment {
  id: string;
  name: string;
  style: SurfaceStyle;
  palette: Palette;
  rules: RoomRules;
  mood: Mood;
}

export const LEVEL_0: Environment = {
  id: "level-0",
  name: "Level 0",
  style: "level0",
  palette: {
    wallpaper: "#c2b34e",
    wallpaperPattern: "#b3a441",
    carpet: "#9c8f3c",
    carpetDark: "#7d722e",
    ceiling: "#cabf66",
    fixture: "#fbf7d0",
  },
  rules: {
    cellSize: 8,
    subGrid: 4,
    wallHeight: 3.0,
    wallThickness: 0.25,
    interiorWallChance: 0.42,
    openingChance: 0.62,
    pillarChance: 0.05,
    lightChance: 0.75,
  },
  mood: {
    fogColor: 0xb6a94a,
    fogDensity: 0.055,
    ambient: 0x6f6a35,
    ambientIntensity: 0.55,
    lightColor: 0xfdfbd0,
    lightIntensity: 2.4,
  },
};

/**
 * The Poolrooms: humid, over-lit white tile, shallow aqua water underfoot, tall
 * ceilings and open pillared expanses. Same generator, different palette + rules +
 * texture style. Fog is thinner here, so the space reads as bright and far-seeing
 * rather than claustrophobic.
 */
export const POOLROOMS: Environment = {
  id: "poolrooms",
  name: "Poolrooms",
  style: "poolrooms",
  palette: {
    wallpaper: "#e7e6dc", // tile
    wallpaperPattern: "#b3b8ad", // grout
    carpet: "#46969c", // shallow water
    carpetDark: "#2c6e77", // deep water
    ceiling: "#d6d6cc", // pale concrete
    fixture: "#eafbfb",
    accent: "#cdeeea", // caustic highlight
  },
  rules: {
    cellSize: 8,
    subGrid: 4,
    wallHeight: 4.4,
    wallThickness: 0.25,
    interiorWallChance: 0.2, // open pools, not a tight maze
    openingChance: 0.68,
    pillarChance: 0.16, // columns standing in the water
    lightChance: 0.6,
  },
  mood: {
    fogColor: 0xa8c4c2,
    fogDensity: 0.026, // you can see across the water
    ambient: 0x8fb0ad,
    ambientIntensity: 0.85,
    lightColor: 0xe6f6f6, // cool white
    lightIntensity: 2.0,
  },
};

/** All selectable environments, in cycle order. */
export const ENVIRONMENTS: Environment[] = [LEVEL_0, POOLROOMS];

export function getEnvById(id: string | null | undefined): Environment {
  return ENVIRONMENTS.find((e) => e.id === id) ?? LEVEL_0;
}
