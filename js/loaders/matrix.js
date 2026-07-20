import { createLoader } from './create-loader.js';
import { setResizeCanvasHook } from '../core/canvas-resize.js';

export const matrixLoader = createLoader(
        () => import('../modules/matrix.js?v=caesar-scroll-3'),
    {
        label: 'matrix module',
        onLoaded(mod) {
            setResizeCanvasHook(() => mod.resizeCanvas());
        },
    },
);
