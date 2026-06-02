/** file:// bundle only — wires canvas-resize to script.js matrix. */
import { setResizeCanvasHook } from './canvas-resize.js';

setResizeCanvasHook(() => {
    if (typeof globalThis.__entropyResizeCanvas === 'function') {
        globalThis.__entropyResizeCanvas();
    }
});
