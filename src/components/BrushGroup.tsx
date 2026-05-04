import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMachine } from '../context/MachineContext';

// Three spinning cylinder brushes inside the cleaning chamber
export function BrushGroup() {
  const { stage, speed } = useMachine();
  const refs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ];

  useFrame((_, delta) => {
    const rate = stage === 'Cleaning' ? speed * 4 : 0.5;
    refs.forEach((r, i) => {
      if (r.current) {
        r.current.rotation.z += delta * rate * (i % 2 === 0 ? 1 : -1);
      }
    });
  });

  const brushPositions: [number, number, number][] = [
    [-0.12, 0.04, 0],
    [0, 0.04, 0],
    [0.12, 0.04, 0],
  ];

  return (
    <group>
      {brushPositions.map((pos, i) => (
        <mesh key={i} ref={refs[i]} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          {/* Brush cylinder */}
          <cylinderGeometry args={[0.045, 0.045, 0.18, 12]} />
          <meshStandardMaterial color="#3a7d3a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
