/**
 * Egg path sa **Three world space** pagkatapos ng parehong FBX pipeline sa `MachineFbxModel`:
 * center → scale (7.5) → corrective euler → ground sa Base_Slab.
 *
 * Kinuha mula sa `scripts/egg-path-from-fbx.mjs` (bbox centers ng subsystem groups).
 * I-run ulit ang script kung may bagong `machine.fbx`.
 */
export const EGG_PATH_STATION_X = {
  /** Papasok (kaliwa) — bago ang cleaning center sa +X flow */
  Input: -114.65,
  Cleaning: -113.15,
  Weighing: -111.1,
  Vision: -110.16,
  Sorting: -109.04,
  /** Dulo papunta sa trays */
  Output: -107.95,
} as const;

export type EggPathStage = keyof typeof EGG_PATH_STATION_X;

/** Y: ibabaw ng belt (`ConveyorBelt_Surface` maxY ~2.89) + clearance. */
export const EGG_PATH_Y_WORLD = 3.02;

/** Z: gitna ng makitid na belt slot (halos pareho sa subsystem bbox). */
export const EGG_BELT_Z_WORLD = -72.88;

/** Lateral na offset sa Z para sa lane (Sorting / Output). */
export const SORT_LANE_Z_OFFSET: Record<string, number> = {
  Small: 0.32,
  Medium: 0.1,
  Large: -0.1,
  Reject: -0.32,
};

/** Unang spawn: bahagyang wala sa kaliwa ng Input stop (malapit sa frame min X). */
export const EGG_SPAWN_X_OFFSET = -0.85;

/** Pinakamalawak na sukat (world units) ng animated egg — mas malaki = mas kitang-kita. */
export const EGG_WORLD_MAX_DIM = 0.52;

/**
 * @deprecated Lumang “legacy scene” units — may uma-import pa sa `MachineScene`.
 * Ang egg path ay gumagamit na ng `EGG_PATH_*` sa world space.
 */
export const STATION_X = {
  Input: -1.1,
  Cleaning: -0.6,
  Weighing: -0.1,
  Vision: 0.35,
  Sorting: 0.8,
  Output: 1.15,
} as const;
