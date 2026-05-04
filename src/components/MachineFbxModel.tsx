import { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFBX } from '@react-three/drei';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { FBX_TARGET_EXTENT, MODEL_CORRECTIVE_EULER } from '../constants/world';
import { EGG_WORLD_MAX_DIM } from '../constants/stations';
import { applyCameraFromSnapshot, cameraFitSnapshot } from '../cameraFitSnapshot';
import { useMachine } from '../context/MachineContext';
import { EMPTY_EGG_TEMPLATES, type EggMeshTemplates } from '../hooks/useStageMachine';
import { detachMeshesToUniqueBuffers } from '../utils/threeDisposal';

const MODEL_FILE = 'machine.fbx';

/** Fusion: bottom reference sa ilalim ng Frame_MainStructure — kadalasang `Base_Slab:1` */
const BASE_SLAB_NAME = /Base_Slab/i;

/** CAD roller: cylinder length = local Z (geometry bbox ~8×8×48). */
const ROLLER_LOCAL_SPIN_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Direksyon ng camera mula sa center — parang Fusion “Home” / front-right isometric
 * (medyo mataas, nakaharap sa origin).
 */
/** Front-right + konting taas — malapit sa default orbit ng Fusion Home */
const VIEW_FUSION = new THREE.Vector3(0.99, 0, 0).normalize();

/** Margin sa CAD-style na distansya (bounding sphere + FOV) */
const FRAME_MARGIN = 1.22;

function modelUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const path = base.endsWith('/') ? `${base}${MODEL_FILE}` : `${base}/${MODEL_FILE}`;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).href;
}

function resetRoot(root: THREE.Object3D) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
}

/** I-center at i-scale; ang sahig (y=0) ay sa `groundToBaseSlab` pagkatapos ng rotation. */
function fitCenterAndScale(root: THREE.Object3D) {
  resetRoot(root);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  });
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) {
    console.warn('[MachineFbxModel] Empty bounding box');
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  if (![center.x, center.y, center.z, size.x, size.y, size.z].every(Number.isFinite)) {
    console.warn('[MachineFbxModel] Invalid bbox');
    return;
  }

  root.position.sub(center);

  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  box2.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  root.scale.multiplyScalar(FBX_TARGET_EXTENT / maxDim);

}

function findBaseSlabMesh(root: THREE.Object3D): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found) return;
    if (BASE_SLAB_NAME.test(obj.name)) found = obj;
  });
  return found;
}

/** Ilapat ang y=0 sa pinakamababang punto ng Base_Slab (world), hindi sa buong assembly. */
function groundToBaseSlab(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const ref = findBaseSlabMesh(root);
  const box = new THREE.Box3();
  if (ref) {
    box.setFromObject(ref);
  } else {
    console.warn('[MachineFbxModel] Walang mesh na pangalan ay tumutugma sa Base_Slab — fallback sa buong modelo.');
    box.setFromObject(root);
  }
  if (box.isEmpty()) return;
  root.position.y -= box.min.y;
}

/** Optional rotation (walang y-adjust dito — sa groundToBaseSlab pagkatapos) */
function applyOptionalOrientation(root: THREE.Object3D) {
  const [rx, ry, rz] = MODEL_CORRECTIVE_EULER;
  if (rx === 0 && ry === 0 && rz === 0) return;
  root.rotation.set(rx, ry, rz);
}

/**
 * Ilipat ang vertices para ang geometry center = mesh origin.
 * Kinakailangan bago mag-spin ang roller; kung hindi, umiikot ang pivot sa dulo at mukhang "hindi pantay" / lumiliko ang roller.
 */
function centerRollerGeometryPivots(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.name !== 'Roller_Input' && obj.name !== 'Roller_Output') return;
    const g = obj.geometry;
    g.computeBoundingBox();
    if (!g.boundingBox) return;
    const c = new THREE.Vector3();
    g.boundingBox.getCenter(c);
    if (c.lengthSq() < 1e-10) return;
    g.translate(-c.x, -c.y, -c.z);
    g.computeBoundingBox();
  });
}

function prepareMeshes(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.visible = true;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      } else if (m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshPhongMaterial) {
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      }
    }
  });
}

/** Distansya ng camera para kasya ang bounding sphere sa vertical at horizontal FOV (CAD-style). */
function cadFrameDistance(box: THREE.Box3, camera: THREE.PerspectiveCamera, margin: number): number {
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const r = Math.max(sphere.radius, 1e-6);
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distV = r / Math.sin(vFov / 2);
  const distH = r / Math.sin(hFov / 2);
  return Math.max(distV, distH) * margin;
}

function computeAndStoreCamera(scene: THREE.Object3D, getState: RootState['get']): boolean {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) return false;

  const { camera } = getState();
  if (!(camera instanceof THREE.PerspectiveCamera)) return false;

  const center = new THREE.Vector3();
  box.getCenter(center);

  const dist = cadFrameDistance(box, camera, FRAME_MARGIN);
  const pos = center.clone().addScaledVector(VIEW_FUSION, dist);

  cameraFitSnapshot.ready = true;
  cameraFitSnapshot.center.copy(center);
  cameraFitSnapshot.position.copy(pos);

  return applyCameraFromSnapshot(getState);
}

function OrbitControlsSnapshotGlue() {
  const get = useThree((s) => s.get);
  const n = useRef(0);
  useFrame(() => {
    if (!cameraFitSnapshot.ready) return;
    if (n.current >= 4) return;
    n.current += 1;
    applyCameraFromSnapshot(get);
  });
  return null;
}

/** Itago ang static CAD eggs; mag-register ng naka-scale na clone para sa `EggAnimator`. */
function registerBuiltInEggTemplates(
  scene: THREE.Object3D,
  registerEggMeshTemplates: (t: EggMeshTemplates) => void
) {
  const originals: THREE.Mesh[] = [];
  const templates: EggMeshTemplates = { Small: null, Medium: null, Large: null };
  const targetMax = EGG_WORLD_MAX_DIM;

  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o.name === 'Egg_Small') {
      originals.push(o);
      const c = o.clone(true);
      detachMeshesToUniqueBuffers(c);
      const box = new THREE.Box3().setFromObject(c);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxD = Math.max(size.x, size.y, size.z, 1e-6);
      c.scale.setScalar(targetMax / maxD);
      templates.Small = c;
      o.visible = false;
    } else if (o.name === 'Egg_Medium') {
      originals.push(o);
      const c = o.clone(true);
      detachMeshesToUniqueBuffers(c);
      const box = new THREE.Box3().setFromObject(c);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxD = Math.max(size.x, size.y, size.z, 1e-6);
      c.scale.setScalar(targetMax / maxD);
      templates.Medium = c;
      o.visible = false;
    } else if (o.name === 'Egg_Large') {
      originals.push(o);
      const c = o.clone(true);
      detachMeshesToUniqueBuffers(c);
      const box = new THREE.Box3().setFromObject(c);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxD = Math.max(size.x, size.y, size.z, 1e-6);
      c.scale.setScalar(targetMax / maxD);
      templates.Large = c;
      o.visible = false;
    }
  });

  const hasAny = templates.Small || templates.Medium || templates.Large;
  if (hasAny) registerEggMeshTemplates(templates);
  else {
    console.warn('[MachineFbxModel] Walang Egg_Small/Medium/Large sa FBX — fallback sphere sa EggAnimator.');
    registerEggMeshTemplates(EMPTY_EGG_TEMPLATES);
  }

  return () => {
    registerEggMeshTemplates(EMPTY_EGG_TEMPLATES);
    for (const m of originals) m.visible = true;
  };
}

/** Umiikot ang rollers; UV scroll sa `ConveyorBelt_Surface` kung may texture map. */
function FbxConveyorDrives({ root }: { root: THREE.Object3D }) {
  const { running, speed } = useMachine();
  const rollersRef = useRef<THREE.Object3D[]>([]);
  const beltMapsRef = useRef<THREE.Texture[]>([]);

  useLayoutEffect(() => {
    const rollers: THREE.Object3D[] = [];
    const maps: THREE.Texture[] = [];
    root.traverse((o) => {
      if (o.name === 'Roller_Input' || o.name === 'Roller_Output') rollers.push(o);
      if (o.name === 'ConveyorBelt_Surface' && o instanceof THREE.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          const m = mat as THREE.MeshStandardMaterial;
          if (m.map) {
            m.map.wrapS = THREE.RepeatWrapping;
            m.map.wrapT = THREE.RepeatWrapping;
            maps.push(m.map);
          }
        }
      }
    });
    rollersRef.current = rollers;
    beltMapsRef.current = maps;
  }, [root]);

  useFrame((_, delta) => {
    const m = running ? speed : 0;
    const spin = delta * 2.8 * m;
    for (const rol of rollersRef.current) {
      rol.rotateOnAxis(ROLLER_LOCAL_SPIN_AXIS, spin);
    }
    for (const map of beltMapsRef.current) {
      map.offset.y -= delta * 0.42 * m;
    }
  });

  return null;
}

export function MachineFbxModel() {
  const url = modelUrl();
  const fbx = useFBX(url);
  const get = useThree((s) => s.get);
  const fittedRef = useRef(false);
  const { registerEggMeshTemplates } = useMachine();

  const scene = useMemo(() => {
    const root = fbx.clone(true);
    prepareMeshes(root);
    centerRollerGeometryPivots(root);
    fitCenterAndScale(root);
    applyOptionalOrientation(root);
    groundToBaseSlab(root);
    return root;
  }, [fbx]);

  useLayoutEffect(() => {
    cameraFitSnapshot.ready = false;
    fittedRef.current = false;
    let cancelled = false;
    let raf = 0;
    let attempts = 0;

    const tick = () => {
      if (cancelled || fittedRef.current) return;
      attempts += 1;
      if (attempts > 160) {
        console.warn('[MachineFbxModel] Hindi na-frame ang camera (max retries).');
        return;
      }
      if (computeAndStoreCamera(scene, get)) {
        fittedRef.current = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [scene, get]);

  useLayoutEffect(() => {
    return registerBuiltInEggTemplates(scene, registerEggMeshTemplates);
  }, [scene, registerEggMeshTemplates]);

  return (
    <>
      <primitive object={scene} dispose={null} />
      <FbxConveyorDrives root={scene} />
      <OrbitControlsSnapshotGlue />
    </>
  );
}
