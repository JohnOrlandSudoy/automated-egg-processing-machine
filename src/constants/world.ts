/**
 * Dapat tumugma sa scale sa `MachineFbxModel.tsx`.
 * `STATION_WORLD_SCALE` — legacy ratio (dating procedural scene ~2.8u → FBX 7.5u).
 * Ang egg path ay `EGG_PATH_*` sa `stations.ts` (world space mula sa modelo).
 */
export const FBX_TARGET_EXTENT = 7.5;
const LEGACY_SCENE_EXTENT = 2.8;
export const STATION_WORLD_SCALE = FBX_TARGET_EXTENT / LEGACY_SCENE_EXTENT;

/**
 * ## Fusion 360 vs Three.js (bakit kailangan ng rotation)
 *
 * Sa **Fusion**: ViewCube = **Z pataas**; ang sahig / `Base_Slab` ay nasa **XY** (horizontal —
 * patag ang slab, nakatayo ang frame sa ibabaw).
 *
 * Sa **Three.js**: **Y pataas**; ang sahig ng scene ay **XZ** (Y = taas).
 *
 * Ang FBX mula Fusion ay halos laging **Z-up**. Para tumugma sa Three nang **hindi tumitirik**
 * ang Base_Slab: i-map ang Fusion **XY floor → Three XZ floor** at **Fusion Z → Three Y**.
 * Ang standard transform ay **−90° sa X** (Euler `[-π/2, 0, 0]`).
 *
 * Pag **[0,0,0]**: ibig sabihin in-export na bilang Y-up ang FBX — subukan kung tumugma na
 * sa Fusion view; kung mali pa rin, gamitin ang `[-π/2, 0, 0]`.
 *
 * **Huwag** gamitin ang `+90° sa Z` dito kung gusto mong patag ang slab — iyon ay
 * pumipihit ng haba ng makina paligid ng Y at sumisira sa “Fusion-like” na layout.
 */
export const MODEL_CORRECTIVE_EULER: [number, number, number] = [-Math.PI / 2, 0, 0];
