# Entropy Garden — project layout

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
| `script.js` | Monolith fallback (`file://` only; excluded from deploy) |
| `core/` | `shared.js`, `state.js`, `canvas-resize.js`, `sw-register.js` |
| `data/` | Lore and poem corpora (`.data.js`) |
| `cipher/` | Vigenère cipher + entropy ring hints (classic scripts) |
| `ios/` | iOS UI, poems archive, terminal boot |
| `boot/` | Classic scripts: `terminal-sfx.js`, `trophies.js` |
| `game/` | Pong + Konami |
| `modules/` | Lazy modules: `terminal`, `matrix`, `singularity`, `arcade` |
| `file-pong-*` | `file://` pong bundle (excluded from deploy) |

## Local dev

```bash
bash scripts/deploy/cloudflare.sh   # build dist/
bash scripts/dev/serve-local.sh     # serve dist on :8765
```

Or double-click `scripts/dev/Serve Entropy Garden.command`.

## Not deployed

`archive/`, `scripts/`, `docs/`, `dist/`, `js/script.js`, `js/file-pong.bundle.js` — see `deploy.exclude`.
