import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMachine } from '../context/MachineContext';

const LANE_LABELS = ['Small', 'Medium', 'Large', 'Reject'] as const;
const LANE_COLORS = ['#f5d020', '#f0883e', '#e04040', '#888888'];
const LANE_Z: Record<string, number> = {
  Small: 0.22,
  Medium: 0.07,
  Large: -0.07,
  Reject: -0.22,
};

// Pusher arm + divider walls for sorting lanes
export function SortingLanes() {
  const { stage, egg } = useMachine();
  const pusherRef = useRef<THREE.Mesh>(null);
  const targetZ = useRef(0);
  const extended = useRef(false);

  useEffect(() => {
    if (stage === 'Sorting' && egg) {
      targetZ.current = LANE_Z[egg.size] ?? 0;
      extended.current = true;
    } else {
      extended.current = false;
    }
  }, [stage, egg]);

  useFrame((_, delta) => {
    if (!pusherRef.current) return;
    const targetX = extended.current ? 0.1 : -0.05;
    pusherRef.current.position.x = THREE.MathUtils.lerp(
      pusherRef.current.position.x,
      targetX,
      delta * 6
    );
    pusherRef.current.position.z = THREE.MathUtils.lerp(
      pusherRef.current.position.z,
      targetZ.current,
      delta * 8
    );
  });

  return (
    <group>
      {/* Base platform */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.45, 0.02, 0.55]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      {/* Divider walls between lanes */}
      {[0.15, 0.0, -0.15].map((z, i) => (
        <mesh key={i} position={[0, 0.04, z]}>
          <boxGeometry args={[0.45, 0.06, 0.01]} />
          <meshStandardMaterial color="#777" />
        </mesh>
      ))}

      {/* Lane color indicators at end */}
      {LANE_LABELS.map((label, i) => (
        <mesh key={label} position={[0.2, 0, LANE_Z[label]]}>
          <boxGeometry args={[0.04, 0.04, 0.12]} />
          <meshStandardMaterial color={LANE_COLORS[i]} emissive={LANE_COLORS[i]} emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Pusher arm */}
      <mesh ref={pusherRef} position={[-0.05, 0.04, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.06]} />
        <meshStandardMaterial color="#cc8800" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
