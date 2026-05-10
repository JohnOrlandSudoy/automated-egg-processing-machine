/** Tatlong kategorya mula sa sukat (vision) — hiwalay sa `Reject` defect. */
export type SizeCategory = 'Small' | 'Medium' | 'Large';

/** Spec: physical bands (camera / vision sorting — hindi lang timbang). */
export const CATEGORY_SPEC = {
  Small: {
    weightMinG: 50,
    weightMaxG: 60,
    lengthMinCm: 5,
    lengthMaxCm: 5.5,
    widthMinCm: 4,
    widthMaxCm: 4.5,
  },
  Medium: {
    weightMinG: 61,
    weightMaxG: 70,
    lengthMinCm: 5.5,
    lengthMaxCm: 6,
    widthMinCm: 4,
    widthMaxCm: 4.5,
  },
  Large: {
    weightMinG: 71,
    weightMaxG: 80,
    lengthMinCm: 6,
    lengthMaxCm: 6.5,
    widthMinCm: 5,
    widthMaxCm: 5.5,
  },
} as const;

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function rndInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1));
}

/** I-classify ang itlog base sa sukat (parang machine vision) + optional timbang. */
export function classifyEggByDimensions(
  lengthCm: number,
  widthCm: number,
  weightG: number
): SizeCategory {
  const inSmall =
    lengthCm >= CATEGORY_SPEC.Small.lengthMinCm - 1e-3 &&
    lengthCm <= CATEGORY_SPEC.Small.lengthMaxCm + 1e-3 &&
    widthCm >= CATEGORY_SPEC.Small.widthMinCm - 1e-3 &&
    widthCm <= CATEGORY_SPEC.Small.widthMaxCm + 1e-3 &&
    weightG >= CATEGORY_SPEC.Small.weightMinG &&
    weightG <= CATEGORY_SPEC.Small.weightMaxG;

  const inMedium =
    lengthCm >= CATEGORY_SPEC.Medium.lengthMinCm - 1e-3 &&
    lengthCm <= CATEGORY_SPEC.Medium.lengthMaxCm + 1e-3 &&
    widthCm >= CATEGORY_SPEC.Medium.widthMinCm - 1e-3 &&
    widthCm <= CATEGORY_SPEC.Medium.widthMaxCm + 1e-3 &&
    weightG >= CATEGORY_SPEC.Medium.weightMinG &&
    weightG <= CATEGORY_SPEC.Medium.weightMaxG;

  const inLarge =
    lengthCm >= CATEGORY_SPEC.Large.lengthMinCm - 1e-3 &&
    lengthCm <= CATEGORY_SPEC.Large.lengthMaxCm + 1e-3 &&
    widthCm >= CATEGORY_SPEC.Large.widthMinCm - 1e-3 &&
    widthCm <= CATEGORY_SPEC.Large.widthMaxCm + 1e-3 &&
    weightG >= CATEGORY_SPEC.Large.weightMinG &&
    weightG <= CATEGORY_SPEC.Large.weightMaxG;

  if (inSmall) return 'Small';
  if (inMedium) return 'Medium';
  if (inLarge) return 'Large';

  // Fallback: pinakamalapit na saklaw base sa haba/lapad
  const mid = { s: 5.25, m: 5.75, l: 6.25 };
  const dS = Math.abs(lengthCm - mid.s) + Math.abs(widthCm - 4.25);
  const dM = Math.abs(lengthCm - mid.m) + Math.abs(widthCm - 4.25);
  const dL = Math.abs(lengthCm - mid.l) + Math.abs(widthCm - 5.25);
  if (dS <= dM && dS <= dL) return 'Small';
  if (dM <= dL) return 'Medium';
  return 'Large';
}

export interface GeneratedEggPhysical {
  lengthCm: number;
  widthCm: number;
  /** Timbang pag malinis (target sa kategorya). */
  weightCleanG: number;
  /** Timbang may dumi / putik (pre-wash). */
  weightDirtyG: number;
  /** Kategorya mula sa “camera” (L×W×W sa saklaw). */
  size: SizeCategory | 'Reject';
  /** True reject (crack / defect) — hiwalay sa size. */
  isDefect: boolean;
}

/**
 * Gumawa ng random profile: consistent ang L/W/weight sa isang kategorya,
 * dirty > clean, + random defect reject.
 */
export function generateEggPhysicals(): GeneratedEggPhysical {
  if (Math.random() < 0.1) {
    const lengthCm = rnd(5, 6.2);
    const widthCm = rnd(4, 5.2);
    const weightCleanG = rndInt(48, 82);
    const mud = rnd(3, 14);
    return {
      lengthCm: Math.round(lengthCm * 100) / 100,
      widthCm: Math.round(widthCm * 100) / 100,
      weightCleanG: Math.round(weightCleanG),
      weightDirtyG: Math.round(weightCleanG + mud),
      size: 'Reject',
      isDefect: true,
    };
  }

  const roll = Math.random();
  const cat: SizeCategory = roll < 0.34 ? 'Small' : roll < 0.67 ? 'Medium' : 'Large';
  const spec = CATEGORY_SPEC[cat];

  const lengthCm = rnd(spec.lengthMinCm, spec.lengthMaxCm);
  const widthCm = rnd(spec.widthMinCm, spec.widthMaxCm);
  const weightCleanG = rndInt(spec.weightMinG, spec.weightMaxG);

  const size = classifyEggByDimensions(lengthCm, widthCm, weightCleanG);

  const mudExtra = rnd(2.5, 12);
  const weightDirtyG = Math.max(weightCleanG + mudExtra, weightCleanG + 1);

  return {
    lengthCm: Math.round(lengthCm * 100) / 100,
    widthCm: Math.round(widthCm * 100) / 100,
    weightCleanG: Math.round(weightCleanG),
    weightDirtyG: Math.round(weightDirtyG * 10) / 10,
    size,
    isDefect: false,
  };
}

/** Pagkatapos ng hugas: tunay na malinis na timbang. */
export function computeCleanWeightAfterWash(weightDirtyG: number): {
  weightCleanG: number;
  mudRemovedG: number;
} {
  const mudRemovedG = Math.round(rnd(2.5, Math.min(14, weightDirtyG - 44)) * 10) / 10;
  const weightCleanG = Math.round((weightDirtyG - mudRemovedG) * 10) / 10;
  return { weightCleanG: Math.max(weightCleanG, 42), mudRemovedG };
}
