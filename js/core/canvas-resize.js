/** Indirection so pong can resize the matrix without importing the lazy module graph. */
let resizeHook = null;

export function setResizeCanvasHook(fn) {
    resizeHook = fn;
}

export function resizeCanvas() {
    if (resizeHook) resizeHook();
}
