import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

const FBX_TARGET_EXTENT = 7.5;
const MODEL_CORRECTIVE_EULER = [-Math.PI / 2, 0, 0];
const STATION_WORLD_SCALE = FBX_TARGET_EXTENT / 2.8;
const BASE_SLAB_NAME = /Base_Slab/i;

function resetRoot(root) {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
}

function prepareMeshes(root) {
  root.traverse((obj) => {
    const mesh = obj;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  });
}

function centerRollerGeometryPivots(root) {
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

function fitCenterAndScale(root) {
  resetRoot(root);
  prepareMeshes(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  root.position.sub(center);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  box2.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  root.scale.multiplyScalar(FBX_TARGET_EXTENT / maxDim);
}

function findBaseSlabMesh(root) {
  let found = null;
  root.traverse((obj) => {
    if (found) return;
    if (BASE_SLAB_NAME.test(obj.name)) found = obj;
  });
  return found;
}

function groundToBaseSlab(root) {
  root.updateWorldMatrix(true, true);
  const ref = findBaseSlabMesh(root);
  const box = new THREE.Box3();
  if (ref) box.setFromObject(ref);
  else box.setFromObject(root);
  if (box.isEmpty()) return;
  root.position.y -= box.min.y;
}

function applyOptionalOrientation(root) {
  const [rx, ry, rz] = MODEL_CORRECTIVE_EULER;
  if (rx === 0 && ry === 0 && rz === 0) return;
  root.rotation.set(rx, ry, rz);
}

function worldCenter(root, name) {
  let obj = null;
  root.traverse((o) => {
    if (o.name === name) obj = o;
  });
  if (!obj) return null;
  root.updateWorldMatrix(true, true);
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return null;
  const c = new THREE.Vector3();
  box.getCenter(c);
  return { x: c.x, y: c.y, z: c.z, maxY: box.max.y };
}

const buf = fs.readFileSync(new URL('../public/machine.fbx', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const fbx = new FBXLoader().parse(ab, '');
const root = fbx.clone(true);
prepareMeshes(root);
centerRollerGeometryPivots(root);
fitCenterAndScale(root);
applyOptionalOrientation(root);
groundToBaseSlab(root);

const labels = [
  'EggInputSystem',
  'CleaningChamber',
  'WeighingStation',
  'VisionChamber',
  'SortingMechanism',
  'Sorting_BasePlatform',
  'ConveyorBelt_Surface',
];

console.log('World centers (after same pipeline as app):\n');
for (const n of labels) {
  const w = worldCenter(root, n);
  console.log(n, w ? `x=${w.x.toFixed(3)} y=${w.y.toFixed(3)} z=${w.z.toFixed(3)} maxY=${w.maxY.toFixed(3)}` : 'NOT FOUND');
}

console.log('\nSuggested STATION_X (legacy) = worldX / STATION_WORLD_SCALE:\n');
const pick = (name) => worldCenter(root, name)?.x;
const ei = pick('EggInputSystem');
const cl = pick('CleaningChamber');
const ws = pick('WeighingStation');
const vc = pick('VisionChamber');
const sm = pick('SortingMechanism');
const sb = pick('Sorting_BasePlatform');
const belt = worldCenter(root, 'ConveyorBelt_Surface');

if (belt) {
  console.log('Belt surface maxY (egg Y hint):', belt.maxY.toFixed(4));
}

function toLegacy(wx) {
  return wx == null ? null : +(wx / STATION_WORLD_SCALE).toFixed(3);
}

console.log({
  Input: toLegacy(ei),
  Cleaning: toLegacy(cl),
  Weighing: toLegacy(ws),
  Vision: toLegacy(vc),
  Sorting: toLegacy(sm ?? sb),
  Output: toLegacy(sb ?? sm),
});
