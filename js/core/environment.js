/**
 * Runtime circumstances (protocol, device, browser) — one place for adapters.
 * Game logic reads these flags; do not fork parallel apps (see archive/legacy/).
 */

export const isFileProtocol = location.protocol === 'file:';
export const isHttpOrigin = location.protocol === 'http:' || location.protocol === 'https:';

/** iPhone / iPad / iPod — excludes macOS laptops (MacIntel + touch, no hover). */
export function isRealIOSDevice() {
    if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) return true;
    return navigator.platform === 'MacIntel'
        && navigator.maxTouchPoints > 1
        && window.matchMedia('(hover: none)').matches;
}

/** Desktop Safari / iPadOS Safari — WebKit canvas is much slower than Chrome. */
export function isSafariBrowser() {
    if (isRealIOSDevice()) return true;
    const ua = navigator.userAgent;
    const isAppleWebKit = /Apple/i.test(navigator.vendor || '');
    const mentionsSafari = /Safari/i.test(ua);
    const isChromium = /Chrome|Chromium|CriOS|Edg\/|OPR\/|Firefox|FxiOS/i.test(ua);
    return isAppleWebKit && mentionsSafari && !isChromium;
}

export const isIOS = isRealIOSDevice();
export const isSafari = isSafariBrowser();

/** Service worker only on deployed https (not file://, not local dev, not iOS). */
export function shouldRegisterServiceWorker() {
    if (isFileProtocol || !('serviceWorker' in navigator)) return false;
    const { protocol, hostname } = location;
    const local = hostname === 'localhost' || hostname === '127.0.0.1';
    if (protocol !== 'https:' && !local) return false;
    if (local || isIOS) return false;
    return true;
}
