/**
 * Promise cache for lazy dynamic imports.
 * @template T
 * @param {() => Promise<T>} importFn
 * @param {{ onLoaded?: (mod: T) => void, label?: string }} [options]
 */
export function createLoader(importFn, { onLoaded, label = 'module' } = {}) {
    /** @type {Promise<T> | null} */
    let promise = null;
    /** @type {T | null} */
    let mod = null;

    return {
        get loaded() {
            return mod;
        },
        load() {
            if (!promise) {
                promise = importFn()
                    .then((loaded) => {
                        mod = loaded;
                        onLoaded?.(loaded);
                        return loaded;
                    })
                    .catch((err) => {
                        promise = null;
                        console.error(`[Entropy Garden] ${label} failed to import`, err);
                        throw err;
                    });
            }
            return promise;
        },
        reset() {
            promise = null;
            mod = null;
        },
    };
}
