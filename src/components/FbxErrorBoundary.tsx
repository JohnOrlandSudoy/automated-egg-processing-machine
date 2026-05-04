import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

type Props = { children: ReactNode };
type State = { err: Error | null };

export class FbxErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[Machine FBX]', err.message, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <Html center>
          <div className="max-w-md rounded-lg border border-red-800 bg-red-950/95 p-4 text-sm text-red-100">
            <p className="mb-1 font-semibold">Hindi ma-load ang FBX</p>
            <p className="break-all opacity-90">{this.state.err.message}</p>
            <p className="mt-2 text-xs opacity-75">
              Tiyakin na may <code className="rounded bg-black/40 px-1">public/machine.fbx</code> at i-restart ang dev
              server.
            </p>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}
