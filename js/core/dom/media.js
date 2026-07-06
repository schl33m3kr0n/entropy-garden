/** Asset path helpers and lazy image loading. */
export const asset = (path) => `assets/${path}`;
export const sfxPath = (file) => asset(`audio/sfx/${file}`);
export const musicPath = (file) => asset(`audio/music/${encodeURIComponent(file)}`);
export const imgPath = (file) => asset(`img/${file}`);

export function setImgWithFallback(el) {
    if (!el || el.tagName !== 'IMG' || el.getAttribute('src')) return;
    const primary = el.dataset.src;
    const fallback = el.dataset.fallback;
    if (!primary) return;
    if (fallback) {
        el.onerror = () => {
            el.onerror = null;
            el.src = fallback;
        };
    }
    el.src = primary;
}
