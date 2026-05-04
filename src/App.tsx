import { useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { MachineProvider } from './context/MachineContext';
import { MachineScene } from './components/MachineScene';
import { applyCameraSnapshotFromRefs, cameraFitSnapshot } from './cameraFitSnapshot';
import { EggAnimator } from './components/EggAnimator';
import { ControlPanel } from './components/ControlPanel';

// Default isometric-ish camera — mas malapit sa origin para malaki sa screen ang FBX (~7.5u)
const DEFAULT_CAMERA_POS: [number, number, number] = [1.05, 0.9, 1.2];
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.35, 0);

function SceneContent({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#c8d8ff', '#3a4a3a', 0.35]} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow />
      <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#aaddff" />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.35}
        maxDistance={80}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.12}
      />

      <Grid
        args={[24, 24]}
        position={[0, -0.32, 0]}
        cellSize={0.25}
        cellThickness={0.4}
        cellColor="#2a3a2a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3a5a3a"
        fadeDistance={28}
        fadeStrength={1}
        infiniteGrid
      />

      <MachineScene />
      <EggAnimator />
    </>
  );
}

export default function App() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const resetCamera = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = (controls as unknown as { object: THREE.PerspectiveCamera }).object;
    if (cameraFitSnapshot.ready) {
      applyCameraSnapshotFromRefs(cam, controls);
    } else {
      cam.position.set(...DEFAULT_CAMERA_POS);
      controls.target.copy(DEFAULT_CAMERA_TARGET);
      cam.updateProjectionMatrix();
      controls.update();
    }
  }, []);

  return (
    <MachineProvider>
      <div className="relative w-screen h-screen bg-[#0a0f14] overflow-hidden">
        <Canvas
          camera={{ position: DEFAULT_CAMERA_POS, fov: 45, near: 0.05, far: 500 }}
          shadows
          gl={{ antialias: true }}
        >
          <SceneContent controlsRef={controlsRef} />
        </Canvas>

        <ControlPanel onResetCamera={resetCamera} />

        <div className="absolute bottom-4 right-4 text-xs text-slate-600 select-none pointer-events-none">
          Salted Egg Machine Simulator · Three.js
        </div>
      </div>
    </MachineProvider>
  );
}
