/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    zIndex?: number;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
    resize?: boolean;
  }
  interface CreateOptions {
    resize?: boolean;
    useWorker?: boolean;
    disableForReducedMotion?: boolean;
  }
  type ConfettiFn = (options?: Options) => Promise<null>;
  export function create(canvas: HTMLCanvasElement, options?: CreateOptions): ConfettiFn;
  const confetti: ConfettiFn;
  export default confetti;
}
