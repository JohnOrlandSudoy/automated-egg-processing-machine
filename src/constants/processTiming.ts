import type { Stage } from '../hooks/useStageMachine';

/** Tagal na nakapako na readout bago bilangin ang “processing” dwell (scaled by speed). */
export const PRE_CHAMBER_SEC: Partial<Record<Stage, number>> = {
  Input: 0.55,
  Cleaning: 0.75,
  Weighing: 0.6,
  Vision: 0.75,
  Sorting: 0.58,
  Output: 0.52,
};

/** Oras ng proseso sa bawat station matapos ang pre-chamber. */
export const PROCESS_DWELL_SEC: Partial<Record<Stage, number>> = {
  Input: 0.65,
  Cleaning: 1.45,
  Weighing: 0.9,
  Vision: 1.25,
  Sorting: 0.95,
  Output: 0.55,
};
