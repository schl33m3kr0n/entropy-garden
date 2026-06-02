// Cloudflare Pages — header fallback when _headers metafile is not applied.
// (_headers / _redirects are config, not static files; they won't appear in the dashboard file list.)

const JS = 'application/javascript; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

export async function onRequest(context) {
    const response = await context.next();
    const { pathname } = new URL(context.request.url);

    if (response.status !== 200) return response;

    const type = response.headers.get('Content-Type') || '';

    if (pathname.endsWith('.js') || pathname === '/sw.js') {
        if (type.includes('javascript')) return response;
        const headers = new Headers(response.headers);
        headers.set('Content-Type', JS);
        return new Response(response.body, { status: response.status, headers });
    }

    if (pathname.endsWith('.html') && !type.includes('html')) {
        const headers = new Headers(response.headers);
        headers.set('Content-Type', HTML);
        return new Response(response.body, { status: response.status, headers });
    }

    return response;
}
