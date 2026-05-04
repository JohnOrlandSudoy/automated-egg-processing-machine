import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

const LEG_PATTERN = /Leg_X800_Y0/i;

const buf = fs.readFileSync(new URL('../public/machine.fbx', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new FBXLoader();
const root = loader.parse(ab, '');

const legNames = [];
root.traverse((o) => {
  if (/^Leg_/i.test(o.name)) legNames.push(o.name);
});

console.log('--- Mga pangalan na nagsisimula sa "Leg_" (sample, max 30) ---');
console.log([...new Set(legNames)].slice(0, 30).join('\n') || '(walang Leg_)');

let target = null;
root.traverse((o) => {
  if (LEG_PATTERN.test(o.name)) target = o;
});

if (!target) {
  console.error('\nHindi nahanap ang part na tumutugma sa /Leg_X800_Y0/i.');
  console.error('Tingnan ang listahan sa itaas o spelling (hal. Leg_X800_Y0:1).');
  process.exit(1);
}

console.log('\n--- Nahanap ---');
console.log('Name:', target.name, '| type:', target.type);

root.updateWorldMatrix(true, true);
target.updateWorldMatrix(true, true);

const box = new THREE.Box3().setFromObject(target);
if (box.isEmpty()) {
  console.log('Bounding box: empty');
  process.exit(0);
}

const size = new THREE.Vector3();
box.getSize(size);
const center = new THREE.Vector3();
box.getCenter(center);

console.log('World AABB center:', center.toArray().map((n) => n.toFixed(4)));
console.log('World AABB size (dx, dy, dz):', {
  dx: size.x.toFixed(4),
  dy: size.y.toFixed(4),
  dz: size.z.toFixed(4),
});

const [sx, sy, sz] = [size.x, size.y, size.z];
const max = Math.max(sx, sy, sz);
const dominant =
  max === sy ? 'Y' : max === sx ? 'X' : 'Z';

console.log('\n--- Reading (Three.js world / file axes bago app rotation) ---');
console.log('Pinakamalawak na sukat:', dominant, '=', max.toFixed(4));

if (max < 1e-6) {
  console.log('Sobrang liit — hindi masabi.');
} else if (sy >= sx * 1.2 && sy >= sz * 1.2) {
  console.log(
    '→ **Vertical** ang dominant extent: mas mahaba ang **Y** kaysa X at Z (parang poste / binti na tumutok sa taas ng Three file space).'
  );
} else if (sx >= sy * 1.2 && sx >= sz * 1.2) {
  console.log('→ **Horizontal** ang dominant extent: mas mahaba ang **X** (hilera / beam along X).');
} else if (sz >= sy * 1.2 && sz >= sx * 1.2) {
  console.log('→ **Horizontal** ang dominant extent: mas mahaba ang **Z** (hilera along Z).');
} else {
  console.log(
    '→ **Halos cubic / pantay** ang tatlong axis — hindi malinaw na “poste” o “beam”; tingnan ang modelo sa CAD.'
  );
}
