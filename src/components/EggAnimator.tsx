import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMachine } from '../context/MachineContext';
import { type EggData, type EggMeshTemplates } from '../hooks/useStageMachine';
import {
  EGG_PATH_STATION_X,
  EGG_PATH_Y_WORLD,
  EGG_BELT_Z_WORLD,
  SORT_LANE_Z_OFFSET,
  EGG_SPAWN_X_OFFSET,
  EGG_WORLD_MAX_DIM,
} from '../constants/stations';
import { PRE_CHAMBER_SEC, PROCESS_DWELL_SEC } from '../constants/processTiming';
import { deepDisposeObject3D, detachMeshesToUniqueBuffers } from '../utils/threeDisposal';

type StationStage = keyof typeof EGG_PATH_STATION_X;

const IDLE_SPAWN_GAP_SEC = 0.45;

/** Reference length (cm) para sa visual scale ng egg mesh. */
const REF_LENGTH_CM = 5.75;

function targetPos(stage: StationStage, eggSize: string): THREE.Vector3 {
  const x = EGG_PATH_STATION_X[stage];
  const y = EGG_PATH_Y_WORLD;
  const zBase = EGG_BELT_Z_WORLD;
  const z =
    stage === 'Sorting' || stage === 'Output' ? zBase + (SORT_LANE_Z_OFFSET[eggSize] ?? 0) : zBase;
  return new THREE.Vector3(x, y, z);
}

function tintRejectGray(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = mats.map((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        const c = mat.clone();
        c.color.setHex(0x6a6a6a);
        if ('emissive' in c && c.emissive) c.emissive.setHex(0x1a1a1a);
        return c;
      }
      return mat;
    });
    mesh.material = next.length === 1 ? next[0] : next;
  });
}

function boostEggVisibility(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        mat.emissive = mat.color.clone();
        mat.emissiveIntensity = 0.35;
        mat.needsUpdate = true;
      }
    }
  });
}

function applyEggLengthScale(inst: THREE.Object3D, egg: EggData) {
  const factor = THREE.MathUtils.clamp(egg.lengthCm / REF_LENGTH_CM, 0.72, 1.22);
  inst.scale.multiplyScalar(factor);
}

function rebuildEggChild(group: THREE.Group, egg: EggData, templates: EggMeshTemplates) {
  while (group.children.length > 0) {
    const c = group.children[0];
    group.remove(c);
    deepDisposeObject3D(c);
  }

  const key = egg.size === 'Reject' ? 'Small' : egg.size;
  const proto = templates[key];

  if (proto) {
    const inst = proto.clone(true);
    detachMeshesToUniqueBuffers(inst);
    applyEggLengthScale(inst, egg);
    if (egg.size === 'Reject') tintRejectGray(inst);
    else boostEggVisibility(inst);
    group.add(inst);
    return;
  }

  const r = EGG_WORLD_MAX_DIM * 0.5 * THREE.MathUtils.clamp(egg.lengthCm / REF_LENGTH_CM, 0.72, 1.22);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 16),
    new THREE.MeshStandardMaterial({
      color: egg.color,
      roughness: 0.35,
      metalness: 0.12,
      emissive: egg.color,
      emissiveIntensity: 0.45,
    })
  );
  mesh.scale.set(1, 0.88, 1);
  group.add(mesh);
}

export function EggAnimator() {
  const { stage, egg, running, speed, spawnEgg, advanceStage, eggMeshTemplates } = useMachine();

  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(
    new THREE.Vector3(
      EGG_PATH_STATION_X.Input + EGG_SPAWN_X_OFFSET,
      EGG_PATH_Y_WORLD,
      EGG_BELT_Z_WORLD
    )
  );
  const preChamberRef = useRef(0);
  const processDwellRef = useRef(0);
  const idleTimerRef = useRef(0);
  const wobbleRef = useRef(0);

  useEffect(() => {
    if (!egg || !groupRef.current) return;
    rebuildEggChild(groupRef.current, egg, eggMeshTemplates);
  }, [egg?.id, egg, eggMeshTemplates]);

  useEffect(() => {
    if (egg && stage === 'Input') {
      posRef.current.set(
        EGG_PATH_STATION_X.Input + EGG_SPAWN_X_OFFSET,
        EGG_PATH_Y_WORLD,
        EGG_BELT_Z_WORLD
      );
      preChamberRef.current = 0;
      processDwellRef.current = 0;
    }
  }, [egg?.id, stage]);

  useEffect(() => {
    preChamberRef.current = 0;
    processDwellRef.current = 0;
  }, [stage]);

  useFrame((_, delta) => {
    if (stage === 'Idle') {
      if (running) {
        idleTimerRef.current += delta;
        if (idleTimerRef.current >= IDLE_SPAWN_GAP_SEC) {
          idleTimerRef.current = 0;
          spawnEgg();
        }
      } else {
        idleTimerRef.current = 0;
      }
      return;
    }

    if (!egg || !groupRef.current) return;

    const scaledDelta = delta * (running ? speed : 0);

    const target = targetPos(stage, egg.size);

    const dist = posRef.current.distanceTo(target);
    const moveSpeed = 1.2 * speed;
    posRef.current.lerp(target, Math.min(1, scaledDelta * moveSpeed * (1 / Math.max(dist, 0.01))));

    groupRef.current.position.copy(posRef.current);

    wobbleRef.current += scaledDelta;

    if (stage === 'Cleaning') {
      groupRef.current.rotation.z = Math.sin(wobbleRef.current * 8) * 0.3;
    } else {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 4);
    }

    const arrived = dist < 0.08;
    if (!arrived) {
      preChamberRef.current = 0;
      processDwellRef.current = 0;
      return;
    }

    const preLimit = PRE_CHAMBER_SEC[stage] ?? 0;
    const dwellLimit = PROCESS_DWELL_SEC[stage] ?? 0.6;

    if (preChamberRef.current < preLimit) {
      preChamberRef.current += scaledDelta;
      return;
    }

    processDwellRef.current += scaledDelta;
    if (processDwellRef.current >= dwellLimit) {
      processDwellRef.current = 0;
      preChamberRef.current = 0;
      wobbleRef.current = 0;
      advanceStage(stage);
    }
  });

  return <group ref={groupRef} />;
}
