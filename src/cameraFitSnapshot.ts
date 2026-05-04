import * as THREE from 'three';
import type { RootState } from '@react-three/fiber';
import { invalidate } from '@react-three/fiber';

/** Pinupuno ng `MachineFbxModel` pagkatapos mag-frame; ginagamit ng Reset + auto-sync. */
export const cameraFitSnapshot = {
  ready: false,
  center: new THREE.Vector3(),
  position: new THREE.Vector3(),
};

/** Parehong logic sa Reset Camera — isang lugar para sa initial view at button. */
export function applyCameraFromSnapshot(getState: RootState['get']): boolean {
  if (!cameraFitSnapshot.ready) return false;
  const { camera, controls, invalidate: inv } = getState();
  if (!(camera instanceof THREE.PerspectiveCamera)) return false;

  const dist = cameraFitSnapshot.position.distanceTo(cameraFitSnapshot.center);
  camera.position.copy(cameraFitSnapshot.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(cameraFitSnapshot.center);
  camera.near = Math.max(0.01, dist * 0.012);
  camera.far = Math.max(250, dist * 55);
  camera.updateProjectionMatrix();

  if (controls && 'target' in controls) {
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void };
    oc.target.copy(cameraFitSnapshot.center);
    oc.update();
  }
  inv();
  return true;
}

/** Para sa Reset mula sa DOM (walang `getState`); gumagamit ng global `invalidate`. */
export function applyCameraSnapshotFromRefs(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null
): boolean {
  if (!cameraFitSnapshot.ready) return false;
  const dist = cameraFitSnapshot.position.distanceTo(cameraFitSnapshot.center);
  camera.position.copy(cameraFitSnapshot.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(cameraFitSnapshot.center);
  camera.near = Math.max(0.01, dist * 0.012);
  camera.far = Math.max(250, dist * 55);
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(cameraFitSnapshot.center);
    controls.update();
  }
  invalidate();
  return true;
}
