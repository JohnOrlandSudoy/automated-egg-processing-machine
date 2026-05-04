import * as THREE from 'three';

/**
 * Gawing hiwalay ang buffer ng bawat mesh sa ilalim ng root (para ligtas ang `dispose` nang hindi
 * sinisira ang orihinal na mesh sa FBX o ang prototype template).
 */
export function detachMeshesToUniqueBuffers(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o.geometry) o.geometry = o.geometry.clone();
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const cloned = mats.map((m) => (m && typeof m.clone === 'function' ? m.clone() : m));
    o.material = cloned.length === 1 ? cloned[0] : cloned;
  });
}

/** Tanggalin ang geometry / materials / textures mula sa clone (hindi ang shared asset sa FBX scene). */
export function deepDisposeObject3D(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const mat = m as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.normalMap?.dispose();
      mat.roughnessMap?.dispose();
      mat.metalnessMap?.dispose();
      mat.dispose();
    }
  });
}
