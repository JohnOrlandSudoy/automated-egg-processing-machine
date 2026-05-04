import { useState, useCallback, useRef } from 'react';
import type { Object3D } from 'three';
import { deepDisposeObject3D } from '../utils/threeDisposal';

export type EggMeshTemplates = {
  Small: Object3D | null;
  Medium: Object3D | null;
  Large: Object3D | null;
};

/**
 * Operational flow (10 steps) → simplified `Stage` pipeline for animation + UI.
 *
 * | # | Process | Current mapping |
 * |---|---------|-----------------|
 * | 1 | Egg input + initial weigh (dirty) | `Input` (spawn + weight roll) |
 * | 2 | Conveyor toward cleaning | start of `Input` → move to `Cleaning` |
 * | 3 | Initial water spray | folded into `Cleaning` dwell / visuals |
 * | 4 | Cleaning chamber (brushes + spray) | `Cleaning` |
 * | 5 | Post-clean weigh (dirt delta) | `Weighing` (single scale; no second weight yet) |
 * | 6 | Machine vision | `Vision` |
 * | 7 | Decision: rewash / reject / good | linear only: `egg.size` drives lane at `Sorting`/`Output` |
 * | 8 | Size sorting (pusher / lanes) | `Sorting` |
 * | 9 | Counting per lane | stats bump at end of `Output` → `Idle` |
 * | 10 | Collection trays | `Output` |
 *
 * TODO for full fidelity: two weights, `Dirty`/`Cracked` + rewash loop back to `Cleaning`.
 */
export type EggSize = 'Small' | 'Medium' | 'Large' | 'Reject';
export type Stage = 'Input' | 'Cleaning' | 'Weighing' | 'Vision' | 'Sorting' | 'Output' | 'Idle';

export interface EggData {
  id: number;
  size: EggSize;
  weight: number;
  status: 'Clean' | 'Reject';
  color: string;
}

export interface Stats {
  total: number;
  small: number;
  medium: number;
  large: number;
  reject: number;
}

const SIZE_COLORS: Record<EggSize, string> = {
  Small: '#f5d020',
  Medium: '#f0883e',
  Large: '#e04040',
  Reject: '#888888',
};

function randomEgg(id: number): EggData {
  const roll = Math.random();
  const size: EggSize =
    roll < 0.25 ? 'Reject' : roll < 0.5 ? 'Small' : roll < 0.75 ? 'Medium' : 'Large';
  const weight = Math.floor(Math.random() * 31) + 60; // 60–90g
  return {
    id,
    size,
    weight,
    status: size === 'Reject' ? 'Reject' : 'Clean',
    color: SIZE_COLORS[size],
  };
}

export const EMPTY_EGG_TEMPLATES: EggMeshTemplates = { Small: null, Medium: null, Large: null };

export function useStageMachine() {
  const [stage, setStage] = useState<Stage>('Idle');
  const [egg, setEgg] = useState<EggData | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, small: 0, medium: 0, large: 0, reject: 0 });
  const [speed, setSpeed] = useState(1);
  /** `false` = simulation stopped; UI shows "Start" (hindi "Pause" agad). */
  const [running, setRunning] = useState(false);
  const [eggMeshTemplates, setEggMeshTemplates] = useState<EggMeshTemplates>(EMPTY_EGG_TEMPLATES);
  const counterRef = useRef(0);

  const registerEggMeshTemplates = useCallback((next: EggMeshTemplates) => {
    setEggMeshTemplates((prev) => {
      (['Small', 'Medium', 'Large'] as const).forEach((k) => {
        const old = prev[k];
        const neu = next[k];
        if (old && old !== neu) deepDisposeObject3D(old);
      });
      return next;
    });
  }, []);

  const spawnEgg = useCallback(() => {
    const id = ++counterRef.current;
    setEgg(randomEgg(id));
    setStage('Input');
  }, []);

  const advanceStage = useCallback(
    (current: Stage) => {
      const order: Stage[] = ['Input', 'Cleaning', 'Weighing', 'Vision', 'Sorting', 'Output'];
      const idx = order.indexOf(current);
      if (idx < order.length - 1) {
        setStage(order[idx + 1]);
      } else {
        // reached Output — record stats then go Idle
        setEgg((prev) => {
          if (prev) {
            setStats((s) => ({
              total: s.total + 1,
              small: s.small + (prev.size === 'Small' ? 1 : 0),
              medium: s.medium + (prev.size === 'Medium' ? 1 : 0),
              large: s.large + (prev.size === 'Large' ? 1 : 0),
              reject: s.reject + (prev.size === 'Reject' ? 1 : 0),
            }));
          }
          return prev;
        });
        setStage('Idle');
      }
    },
    []
  );

  const resetStats = useCallback(() => {
    setStats({ total: 0, small: 0, medium: 0, large: 0, reject: 0 });
  }, []);

  const toggleRunning = useCallback(() => setRunning((v) => !v), []);

  return {
    stage,
    egg,
    stats,
    speed,
    running,
    setSpeed,
    spawnEgg,
    advanceStage,
    resetStats,
    toggleRunning,
    eggMeshTemplates,
    registerEggMeshTemplates,
  };
}
