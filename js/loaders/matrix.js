import { createLoader } from './create-loader.js';
import { setResizeCanvasHook } from '../core/canvas-resize.js';

export const matrixLoader = createLoader(
    () => import('../modules/matrix.js'),
    {
        label: 'matrix module',
        onLoaded(mod) {
            setResizeCanvasHook(() => mod.resizeCanvas());
        },
    },
);
