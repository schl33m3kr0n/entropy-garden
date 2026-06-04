# Entropy Garden — project layout

## One app, circumstance adapters

All garden logic lives in **ES modules** (`js/main.js` and imports). Runtime differences (Safari, iOS, reduced motion, local vs production HTTPS) are handled inside that tree — mainly `js/core/environment.js` and `js/core/shared.js` (`perf`).

Do **not** maintain a parallel app. Legacy monolith lives in `archive/legacy/` only. Local preview uses the same bundle as Cloudflare.

## Site root (published via `dist/`)

| Path | Role |
|------|------|
| `index.html` | Entry page |
| `404.html` | Custom 404 (use “404 page” mode on Cloudflare, not SPA) |
| `sw.js` | Service worker |
| `_headers`, `_redirects`, `_routes.json` | Cloudflare Pages config (not served as URLs) |
| `css/style.css` | Styles |
| `assets/` | Fonts, icons, images, audio, video |
| `pages/` | Genesis subpage |
| `functions/` | Pages middleware (JS MIME fallback) |

## JavaScript (`js/`)

| Path | Role |
|------|------|
| `main.js` | ES module entry (http/https) |
| `lazy.js` | Lazy loader for terminal, matrix, singularity, arcade |
| `core/environment.js` | Protocol / device / browser flags |
| `core/` | `shared.js`, `state.js`, `canvas-resize.js`, `sw-register.js` |
| `boot/file-protocol-guard.js` | Blocks `file://` (modules unavailable); points to local serve |
| `data/` | Lore, poems, cipher wheel glyph pools (`cipher-glyphs.data.js`) |
| `cipher/` | Vigenère, entropy ring hints, `wheel-fill.js` (blank/tofu slot refill) |
| `ios/` | iOS UI, poems archive, terminal boot |
| `boot/` | Classic scripts: `terminal-sfx.js`, `trophies.js` |
| `game/` | Pong + Konami |
| `modules/` | Lazy modules: `terminal`, `matrix`, `singularity`, `arcade` |

### Legacy (`archive/legacy/` — not loaded)

| Path | Role |
|------|------|
| `script.js` | Former monolith (~161 KiB) |
| `file-pong.bundle.js`, `file-pong-boot.js`, `file-lazy-shim.js` | Former `file://` pong shim |

See `archive/legacy/README.md`.

## Local dev

```bash
bash scripts/deploy/cloudflare.sh   # build dist/
bash scripts/dev/serve-local.sh     # serve dist on :8765
```

Or double-click `scripts/dev/Serve Entropy Garden.command`.

Opening `index.html` directly (`file://`) shows a notice only; use the local server for a faithful preview.

## Not deployed

`archive/`, `scripts/`, `docs/`, `dist/` — see `deploy.exclude`.
