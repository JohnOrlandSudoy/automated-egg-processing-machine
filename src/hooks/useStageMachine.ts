import { useState, useCallback, useRef } from 'react';
import type { Object3D } from 'three';
import { deepDisposeObject3D } from '../utils/threeDisposal';
import { generateEggPhysicals, computeCleanWeightAfterWash } from '../simulation/eggSizing';

export type EggMeshTemplates = {
  Small: Object3D | null;
  Medium: Object3D | null;
  Large: Object3D | null;
};

/**
 * Operational flow (10 steps) → simplified `Stage` pipeline for animation + UI.
 * Timbang: dumi vs malinis pagkatapos ng Cleaning. Sukat: vision (L×W) → kategorya.
 */
export type EggSize = 'Small' | 'Medium' | 'Large' | 'Reject';
export type Stage = 'Input' | 'Cleaning' | 'Weighing' | 'Vision' | 'Sorting' | 'Output' | 'Idle';

export type EggSurfaceStatus = 'Soiled' | 'Clean' | 'Reject';

export interface EggData {
  id: number;
  size: EggSize;
  /** Display: kasalukuyang timbang na ipinapakita (dumi bago wash, malinis pagkatapos). */
  weight: number;
  weightDirtyG: number;
  weightCleanG: number | null;
  mudRemovedG: number | null;
  lengthCm: number;
  widthCm: number;
  status: EggSurfaceStatus;
  /** Crack / defect → reject lane */
  isDefect?: boolean;
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

function buildEggData(id: number): EggData {
  const p = generateEggPhysicals();
  const size: EggSize = p.isDefect ? 'Reject' : p.size;
  return {
    id,
    size,
    color: SIZE_COLORS[size],
    weightDirtyG: p.weightDirtyG,
    weightCleanG: null,
    mudRemovedG: null,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    status: p.isDefect ? 'Reject' : 'Soiled',
    isDefect: p.isDefect,
    weight: p.weightDirtyG,
  };
}

export const EMPTY_EGG_TEMPLATES: EggMeshTemplates = { Small: null, Medium: null, Large: null };

export function useStageMachine() {
  const [stage, setStage] = useState<Stage>('Idle');
  const [egg, setEgg] = useState<EggData | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, small: 0, medium: 0, large: 0, reject: 0 });
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [eggMeshTemplates, setEggMeshTemplates] = useState<EggMeshTemplates>(EMPTY_EGG_TEMPLATES);
  const [interiorView, setInteriorView] = useState(false);
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
    setEgg(buildEggData(id));
    setStage('Input');
  }, []);

  const advanceStage = useCallback((current: Stage) => {
    const order: Stage[] = ['Input', 'Cleaning', 'Weighing', 'Vision', 'Sorting', 'Output'];
    const idx = order.indexOf(current);
    if (idx < order.length - 1) {
      if (current === 'Cleaning') {
        setEgg((prev) => {
          if (!prev) return prev;
          if (prev.size === 'Reject' && prev.isDefect) {
            return {
              ...prev,
              weightCleanG: prev.weightDirtyG,
              mudRemovedG: 0,
              weight: prev.weightDirtyG,
            };
          }
          const { weightCleanG, mudRemovedG } = computeCleanWeightAfterWash(prev.weightDirtyG);
          return {
            ...prev,
            weightCleanG,
            mudRemovedG,
            weight: weightCleanG,
            status: 'Clean',
          };
        });
      }
      setStage(order[idx + 1]);
    } else {
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
  }, []);

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
    interiorView,
    setInteriorView,
  };
}
