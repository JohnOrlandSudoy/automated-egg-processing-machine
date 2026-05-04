import { createContext, useContext, ReactNode } from 'react';
import { useStageMachine, Stage, EggData, Stats, EggMeshTemplates } from '../hooks/useStageMachine';

interface MachineContextValue {
  stage: Stage;
  egg: EggData | null;
  stats: Stats;
  speed: number;
  running: boolean;
  setSpeed: (v: number) => void;
  spawnEgg: () => void;
  advanceStage: (current: Stage) => void;
  resetStats: () => void;
  toggleRunning: () => void;
  eggMeshTemplates: EggMeshTemplates;
  registerEggMeshTemplates: (t: EggMeshTemplates) => void;
}

const MachineContext = createContext<MachineContextValue | null>(null);

export function MachineProvider({ children }: { children: ReactNode }) {
  const value = useStageMachine();
  return <MachineContext.Provider value={value}>{children}</MachineContext.Provider>;
}

export function useMachine(): MachineContextValue {
  const ctx = useContext(MachineContext);
  if (!ctx) throw new Error('useMachine must be used inside MachineProvider');
  return ctx;
}
