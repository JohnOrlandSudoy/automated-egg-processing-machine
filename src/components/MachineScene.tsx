import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { FbxErrorBoundary } from './FbxErrorBoundary';
import { MachineFbxModel } from './MachineFbxModel';

export { STATION_X } from '../constants/stations';

function LoadFallback() {
  return (
    <Html center>
      <p className="rounded-lg border border-slate-600 bg-slate-900/90 px-4 py-2 text-sm text-slate-200">
        Loading 3D model…
      </p>
    </Html>
  );
}

export function MachineScene() {
  return (
    <FbxErrorBoundary>
      <Suspense fallback={<LoadFallback />}>
        <MachineFbxModel />
      </Suspense>
    </FbxErrorBoundary>
  );
}
