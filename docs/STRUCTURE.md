# Entropy Garden — project layout

## One app, circumstance adapters

All garden logic lives in **ES modules** (`js/main.js` and imports). Runtime differences (Safari, iOS, reduced motion, local vs production HTTPS) are handled inside that tree — mainly `js/core/environment.js`, `js/core/canvas-perf.js` (`perf`), and the re-export barrel `js/core/shared.js`.

Do **not** maintain a parallel app. Legacy monolith lives in `archive/legacy/` only. Local preview uses the same bundle as Cloudflare.

## Site root (published via `dist/`)

| Path | Role |
|------|------|
| `index.html` | Entry page |
| `404.html` | Custom 404 (use “404 page” mode on Cloudflare, not SPA) |
| `sw.js` | Service worker |
| `_headers`, `_redirects`, `_routes.json` | Cloudflare Pages config (not served as URLs) |
| `css/style.css` | Stylesheet entry (`@import` partials) |
| `css/tokens.css`, `css/base.css`, `css/garden.css`, `css/chrome.css`, `css/games.css`, `css/ios.css`, `css/motion.css` | Stylesheet partials |
| `assets/` | Fonts, icons, images, audio, video |
| `pages/` | Genesis subpage |
| `functions/` | Pages middleware (JS MIME fallback) |

## JavaScript (`js/`)

| Path | Role |
|------|------|
| `main.js` | ES module entry (http/https) |
| `lazy.js` | Facade barrel → `loaders/` + `facades/` |
| `loaders/` | Promise cache per lazy module (`create-loader.js`) |
| `facades/` | Call-through stubs (terminal, matrix, singularity, arcade, cards) |
| `ui/` | DOM bindings (`sidebar.js`, `playlist.js`, `modal-a11y.js`) |
| `core/environment.js` | Protocol / device / browser flags |
| `core/shared.js` | Re-export barrel (imports unchanged across the app) |
| `core/dom/media.js` | Asset paths, lazy image fallback |
| `core/audio/bgm.js` | Playlist, buffering, marquee, prev/next |
| `core/audio/sfx.js` | Sound effects pool + playback helpers |
| `core/lore/random.js` | Shuffle bags, `pickOne` / `pickMany`, comment TTL |
| `core/canvas-perf.js` | Matrix canvas refs, cipher pools, `perf` tuning |
| `core/hooks.js` | Cross-module hook registry (`registerHook`, `callHook`, `on`/`emit`) |
| `core/` | Also: `state.js`, `canvas-resize.js`, `sw-register.js` |
| `panopticon/` | Eye runtime (`_runtime.js`), `dom.js`, `god-mode.js`, `comments.js`, `eye.js`, barrel `index.js` |
| `boot/file-protocol-guard.js` | Blocks `file://` (modules unavailable); points to local serve |
| `data/` | Lore partials (`data/lore/*.data.js`), poems, cipher wheel glyph pools |
| `cipher/` | Vigenère (`vigenere-core.js`, `vigenere.js`), entropy ring hints, `wheel-fill.js` |
| `ios/` | iOS UI, poems archive, terminal boot |
| `boot/` | Classic scripts: `terminal-sfx.js`, `trophies.js` |
| `game/` | Pong (`pong/session.js`, `pong/constants.js`), Konami, Cards of Chaos (`cards/game.js`) |
| `modules/` | Lazy modules: `terminal`, `matrix`, `singularity`, `arcade` |

### Legacy (`archive/legacy/` — not loaded)

| Path | Role |
|------|------|
| `script.js` | Former monolith (~161 KiB) |
| `file-pong.bundle.js`, `file-pong-boot.js`, `file-lazy-shim.js` | Former `file://` pong shim |

See `archive/legacy/README.md`.

## Cross-module hooks (`js/core/hooks.js`)

Lazy-loaded features register callbacks instead of mutating `globalThis` ad hoc. ES modules use:

- `registerHook(name, fn)` / `registerHooks({ … })` — install or replace a handler
- `getHook(name)` / `callHook(name, …args)` — read or invoke
- `on(event, fn)` / `emit(event, detail)` — optional pub/sub (not yet widely used)

`installGardenHooksGlobal()` mirrors the registry onto `globalThis.gardenHooks` for classic scripts (`js/ios/terminal-boot.js`).

| Hook | Registered by | Purpose |
|------|---------------|---------|
| `toggleTerminal`, `openTerminal` | `terminal.js`, `lazy.js` | Terminal FAB / programmatic open |
| `toggleBossKey`, `handleReroll`, `toggleMode`, `resetTimeline`, `resetIdleTimer` | `main.js` | Keyboard shortcuts, timeline reset |
| `firePanopticonComment`, `syncPanopticonCodeSequenceComments` | `main.js` | Panopticon speech bubble |
| `recordBehavior`, `printBehaviorReport`, `getBehaviorSnapshot` | `main.js` | Behavioral analysis easter egg |
| `stopGardenLoop`, `resumeGardenLoop`, `setCorrupted` | `main.js` | Matrix loop + corruption state |
| `konamiBlocksPongArming`, `isKonamiInProgress`, `isKonamiActivelyEntering` | `lazy.js` (after pong/konami load) | Konami ↔ pong coordination |
| `isPongArmingActive`, `isPongSessionActive`, `pongBlocksArrowNav` | `lazy.js` | Pong session guards |
| `konamiClaimsKey`, `cancelPongArming`, `cancelKonamiArming`, `resetKonamiSequence` | `lazy.js` | Input routing |

## Icons (`css/chrome.css`)

UI glyphs use **`.mask-icon`** — theme color via `background-color: var(--neon-green)` (or `--alert-red` in corrupted mode), shape via `mask-image`. Modifiers set the asset (`.mask-icon--identity`, `--trophy`, `--skip`, etc.) and size (`.mask-icon--sidebar`, `--sidebar-lg`, `--playlist`).

## Modal accessibility (`js/ui/modal-a11y.js`)

`openModal` / `closeModal` in `main.js` call `onModalOpened` / `onModalClosed` for focus restore, `role="dialog"`, `aria-modal`, and `aria-hidden`. Escape closes the topmost open modal. Sidebar items with `data-modal` get keyboard activation; playlist transport gets consistent `aria-label` / `aria-pressed` (see also `playlist-icons.js`).

## Local dev

```bash
bash scripts/deploy/cloudflare.sh   # build dist/ (injects git hash into sw.js CACHE_VERSION)
bash scripts/dev/serve-local.sh     # serve dist on :8765
npm install && npm test             # Vitest — vigenère, behavioral labels, poem pool
```

Run `bash scripts/dev/serve-local.sh`.

Opening `index.html` directly (`file://`) shows a notice only; use the local server for a faithful preview.

### Service worker cache version

Source `sw.js` keeps `const CACHE_VERSION = '__EG_CACHE_VERSION__'`. `scripts/deploy/cloudflare.sh` runs `scripts/dev/inject-sw-cache-version.sh` on `dist/sw.js` after pack so deploys never rely on manual version bumps.

### Tests (`scripts/test/`)

Vitest targets pure logic only (no browser runtime):

- `vigenere.test.js` — `js/cipher/vigenere-core.js`
- `behavioral-analysis.test.js` — `deriveProfileLabels()` in `js/modules/behavioral-labels.js`
- `singularity-poems.test.js` — `buildSingularityPoemPool()` corruption toggle

### Optional future bundler

If CSS/JS splits grow, a zero-config step (esbuild/Vite) could concatenate CSS, tree-shake data, and inline small assets into `dist/` without changing the static Pages model. Not wired today.

## Not deployed

`archive/`, `scripts/`, `docs/`, `dist/` — see `deploy.exclude`.
