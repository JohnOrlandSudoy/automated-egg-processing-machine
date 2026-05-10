import { useMachine } from '../context/MachineContext';
import { Stage } from '../hooks/useStageMachine';
import { CATEGORY_SPEC } from '../simulation/eggSizing';

/** Mga processing stage (walang Idle) — para sa "done" at weight visibility. */
const PIPELINE_STAGES: Stage[] = ['Input', 'Cleaning', 'Weighing', 'Vision', 'Sorting', 'Output'];

/** Kasama ang Idle para sa Current Stage UI (`Idle` dati ay wala sa listahan → broken highlight). */
const STAGES_FOR_UI: Stage[] = [...PIPELINE_STAGES, 'Idle'];

const STAGE_ICONS: Record<Stage, string> = {
  Input: '📥',
  Cleaning: '🚿',
  Weighing: '⚖️',
  Vision: '📷',
  Sorting: '🔀',
  Output: '📦',
  Idle: '⏳',
};

interface ControlPanelProps {
  onResetCamera: () => void;
}

function statusClass(s: string) {
  if (s === 'Clean') return 'text-emerald-400';
  if (s === 'Soiled') return 'text-amber-300';
  return 'text-red-400';
}

export function ControlPanel({ onResetCamera }: ControlPanelProps) {
  const {
    stage,
    egg,
    stats,
    speed,
    running,
    setSpeed,
    toggleRunning,
    resetStats,
    interiorView,
    setInteriorView,
  } = useMachine();

  return (
    <div className="absolute inset-y-0 left-0 w-[22rem] flex flex-col gap-3 p-4 overflow-y-auto pointer-events-none">
      {/* Title card */}
      <div
        className="rounded-xl p-4 pointer-events-auto"
        style={{ background: 'rgba(10,20,30,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-1">
          Machine Simulator
        </div>
        <div className="text-white font-bold text-base leading-tight">
          Salted Egg Cleaning &<br />Sorting Machine
        </div>
      </div>

      {/* Stage progress */}
      <div
        className="rounded-xl p-4 pointer-events-auto"
        style={{ background: 'rgba(10,20,30,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Current Stage
        </div>
        <div className="flex flex-col gap-1">
          {STAGES_FOR_UI.map((s) => {
            const active = stage === s;
            const done =
              stage === 'Idle'
                ? PIPELINE_STAGES.includes(s)
                : PIPELINE_STAGES.includes(s) &&
                  PIPELINE_STAGES.indexOf(s) < PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);
            return (
              <div
                key={s}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-300 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : done
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                <span className="text-base">{STAGE_ICONS[s]}</span>
                <span>{s}</span>
                {active && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Egg + sensor readout (sync sa stage / chamber) */}
      <div
        className="rounded-xl p-4 pointer-events-auto"
        style={{ background: 'rgba(10,20,30,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
          Egg &amp; sensors
        </div>
        <div className="text-[10px] text-slate-500 mb-2 leading-snug">
          Timbang may dumi → matapos hugas. Sukat (L×W) = vision / camera sort. Sakto ang readout sa bawat
          chamber habang tumatakbo ang stage.
        </div>
        {egg ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="rounded-lg bg-slate-900/80 border border-slate-700/50 px-2 py-1.5 mb-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Active chamber</div>
              <div className="text-emerald-300 font-semibold">
                {stage === 'Idle' ? 'Idle (hihintay)' : stage}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">Size (camera)</span>
              <span
                className="font-bold px-2 py-0.5 rounded-full text-xs shrink-0"
                style={{
                  background: egg.color + '30',
                  color: egg.color,
                  border: `1px solid ${egg.color}60`,
                }}
              >
                {egg.size}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">L × W</span>
              <span className="text-white font-mono text-xs">
                {egg.lengthCm} × {egg.widthCm} cm
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pre-wash (may dumi)</span>
              <span className="text-amber-200 font-mono">{egg.weightDirtyG} g</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pagkatapos hugas</span>
              <span className="text-cyan-200 font-mono">
                {egg.weightCleanG != null ? `${egg.weightCleanG} g` : '—'}
              </span>
            </div>

            {egg.mudRemovedG != null && egg.mudRemovedG > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dumi natanggal</span>
                <span className="text-slate-200 font-mono">
                  −{egg.mudRemovedG} g ({((egg.mudRemovedG / egg.weightDirtyG) * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-semibold ${statusClass(egg.status)}`}>{egg.status}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Display weight (UI)</span>
              <span className="text-white font-mono">{egg.weight} g</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Egg #</span>
              <span className="text-slate-300 font-mono">{egg.id}</span>
            </div>

            <div className="mt-1 pt-2 border-t border-slate-700/50 text-[10px] text-slate-500 leading-relaxed">
              Bands: S {CATEGORY_SPEC.Small.weightMinG}–{CATEGORY_SPEC.Small.weightMaxG}g L
              {CATEGORY_SPEC.Small.lengthMinCm}–{CATEGORY_SPEC.Small.lengthMaxCm} · M{' '}
              {CATEGORY_SPEC.Medium.weightMinG}–{CATEGORY_SPEC.Medium.weightMaxG} · L{' '}
              {CATEGORY_SPEC.Large.weightMinG}–{CATEGORY_SPEC.Large.weightMaxG} (vision)
            </div>
          </div>
        ) : (
          <div className="text-slate-600 text-sm italic">No egg in process</div>
        )}
      </div>

      {/* Stats */}
      <div
        className="rounded-xl p-4 pointer-events-auto"
        style={{ background: 'rgba(10,20,30,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Statistics
          </div>
          <button
            onClick={resetStats}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-lg p-2 text-center">
            <div className="text-slate-400 text-xs">Total</div>
            <div className="text-white font-bold text-lg">{stats.total}</div>
          </div>
          <div className="bg-yellow-900/30 rounded-lg p-2 text-center border border-yellow-700/20">
            <div className="text-yellow-400 text-xs">Small</div>
            <div className="text-yellow-300 font-bold text-lg">{stats.small}</div>
          </div>
          <div className="bg-orange-900/30 rounded-lg p-2 text-center border border-orange-700/20">
            <div className="text-orange-400 text-xs">Medium</div>
            <div className="text-orange-300 font-bold text-lg">{stats.medium}</div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-2 text-center border border-red-700/20">
            <div className="text-red-400 text-xs">Large</div>
            <div className="text-red-300 font-bold text-lg">{stats.large}</div>
          </div>
          <div
            className="col-span-2 rounded-lg p-2 text-center"
            style={{ background: 'rgba(100,100,100,0.15)', border: '1px solid rgba(120,120,120,0.2)' }}
          >
            <div className="text-slate-400 text-xs">Reject</div>
            <div className="text-slate-300 font-bold text-lg">{stats.reject}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className="rounded-xl p-4 pointer-events-auto"
        style={{ background: 'rgba(10,20,30,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Controls
        </div>

        {/* Speed slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Speed</span>
            <span className="text-white font-mono">{speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-0.5">
            <span>0.5x</span>
            <span>3x</span>
          </div>
        </div>

        {/* Start / Pause */}
        <button
          onClick={toggleRunning}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
            running
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
        >
          {running ? 'Pause' : 'Start'}
        </button>

        <button
          type="button"
          onClick={() => setInteriorView(!interiorView)}
          className={`w-full mt-2 py-2 rounded-lg font-semibold text-sm border transition-all duration-200 ${
            interiorView
              ? 'bg-sky-500/25 text-sky-200 border-sky-500/40'
              : 'text-slate-300 border-slate-600 hover:bg-slate-700/40'
          }`}
        >
          {interiorView ? 'Loob: bukas (cutaway)' : 'Tingnan ang loob ng chamber'}
        </button>

        {/* Reset camera */}
        <button
          onClick={onResetCamera}
          className="w-full mt-2 py-2 rounded-lg font-semibold text-sm text-slate-300 border border-slate-600 hover:bg-slate-700/40 transition-all duration-200"
        >
          Reset Camera
        </button>
      </div>
    </div>
  );
}
