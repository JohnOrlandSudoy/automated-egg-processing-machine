import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

const buf = fs.readFileSync(new URL('../public/machine.fbx', import.meta.url));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new FBXLoader();
try {
  const obj = loader.parse(ab, '');
  console.log('Root type:', obj.type, 'children:', obj.children.length);
  let meshes = 0;
  let skinned = 0;
  obj.traverse((c) => {
    if (c.isMesh) meshes++;
    if (c.isSkinnedMesh) skinned++;
  });
  console.log('Mesh count:', meshes, 'SkinnedMesh:', skinned);
  let transparentZero = 0;
  obj.traverse((c) => {
    if (!c.isMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    for (const m of mats) {
      if (m.transparent && m.opacity === 0) transparentZero++;
    }
  });
  console.log('Meshes with opacity 0:', transparentZero);
  const box = new THREE.Box3().setFromObject(obj);
  console.log('Box empty:', box.isEmpty(), 'min:', box.min.toArray(), 'max:', box.max.toArray());
} catch (e) {
  console.error('PARSE FAILED:', e.message);
  process.exit(1);
}
