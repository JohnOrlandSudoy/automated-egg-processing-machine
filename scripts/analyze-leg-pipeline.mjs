import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

const FBX_TARGET_EXTENT = 7.5;
const MODEL_CORRECTIVE_EULER = [-Math.PI / 2, 0, 0];

const buf = fs.readFileSync(new URL('../public/machine.fbx', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const root = new FBXLoader().parse(ab, '');

function fitCenterAndScale(r) {
  r.position.set(0, 0, 0);
  r.rotation.set(0, 0, 0);
  r.scale.set(1, 1, 1);
  r.traverse((obj) => {
    const mesh = obj;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  });
  r.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(r);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  r.position.sub(center);
  r.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(r);
  box2.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  r.scale.multiplyScalar(FBX_TARGET_EXTENT / maxDim);
}

function applyOrientation(r) {
  const [rx, ry, rz] = MODEL_CORRECTIVE_EULER;
  r.rotation.set(rx, ry, rz);
}

function legBox(r, nameRe) {
  let target = null;
  r.traverse((o) => {
    if (nameRe.test(o.name)) target = o;
  });
  if (!target) return null;
  r.updateWorldMatrix(true, true);
  target.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(target);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { name: target.name, size: size.toArray().map((n) => +n.toFixed(6)) };
}

const LEG = /Leg_X800_Y0/i;

console.log('1) Raw (no pipeline):', legBox(root, LEG));

const r2 = root.clone(true);
fitCenterAndScale(r2);
console.log('2) After fitCenterAndScale only:', legBox(r2, LEG));

const r3 = root.clone(true);
fitCenterAndScale(r3);
applyOrientation(r3);
console.log('3) After fit + MODEL_CORRECTIVE_EULER [-pi/2,0,0]:', legBox(r3, LEG));

const r4 = root.clone(true);
fitCenterAndScale(r4);
r4.rotation.set(Math.PI / 2, 0, 0);
console.log('4) After fit + [+pi/2,0,0] on X:', legBox(r4, LEG));

const r5 = root.clone(true);
fitCenterAndScale(r5);
r5.rotation.set(0, 0, 0);
console.log('5) After fit + [0,0,0]:', legBox(r5, LEG));
