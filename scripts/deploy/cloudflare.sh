#!/usr/bin/env bash
# Production bundle for Cloudflare Pages (publish dist/ as site output).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

log() { echo "==> $*"; }
DEST="$ROOT/dist"
EXCLUDE_FILE="$ROOT/deploy.exclude"
MAX_MIB=120

log "Entropy Garden — Cloudflare Pages bundle"
log "Removing previous dist/"
rm -rf "$DEST"
mkdir -p "$DEST"

# Cloudflare Pages build images do not ship rsync; tar is always available.
TAR_EXCLUDES=(
  '.git'
  '.gitignore'
  '.DS_Store'
  '.netlify'
  'node_modules'
  'dist'
  'archive'
  'scripts'
  'docs'
  'assets/video/genesis-web.mov'
  'assets/img/vault/sun-poster.png'
  'deploy.exclude'
  'deploy.manifest'
  '.netlifyignore'
  'netlify.toml'
  'Serve Entropy Garden.command'
  'public'
)

append_tar_exclude() {
  local pattern="$1"
  pattern="${pattern%%$'\r'}"
  pattern="${pattern#"${pattern%%[![:space:]]*}"}"
  pattern="${pattern%"${pattern##*[![:space:]]}"}"
  [ -z "$pattern" ] && return 0
  [[ "$pattern" == \#* ]] && return 0
  pattern="${pattern#/}"
  pattern="${pattern%/}"
  TAR_EXCLUDES+=("$pattern")
}

if [ -f "$EXCLUDE_FILE" ]; then
  while IFS= read -r pattern || [ -n "$pattern" ]; do
    append_tar_exclude "$pattern"
  done < "$EXCLUDE_FILE"
fi

TAR_ARGS=()
for pattern in "${TAR_EXCLUDES[@]}"; do
  TAR_ARGS+=(--exclude="$pattern")
done

log "Packing repository into dist/ (tar; may take ~30s on CI)..."
if ! (
  cd "$ROOT"
  tar "${TAR_ARGS[@]}" -cf - .
) | (
  cd "$DEST"
  tar -xf -
); then
  echo "Deploy failed: could not create dist/ bundle" >&2
  exit 1
fi
log "Pack complete."

# Cloudflare Pages reads _headers / _redirects / _routes.json from the publish root
for meta in _headers _redirects _routes.json; do
  if [ -f "$ROOT/$meta" ]; then
    cp "$ROOT/$meta" "$DEST/$meta"
  fi
done

check_file() {
  if [ ! -f "$1" ]; then
    echo "Deploy check failed: missing $1" >&2
    exit 1
  fi
}

log "Verifying dist/ contents..."
check_file "$DEST/index.html"
check_file "$DEST/404.html"
check_file "$DEST/js/main.js"
check_file "$DEST/js/lazy.js"
check_file "$DEST/js/core/shared.js"
check_file "$DEST/js/modules/matrix.js"
check_file "$DEST/js/modules/singularity.js"
check_file "$DEST/js/modules/arcade.js"
check_file "$DEST/js/game/pong.js"
check_file "$DEST/js/game/konami.js"
check_file "$DEST/_headers"
check_file "$DEST/_redirects"
check_file "$DEST/_routes.json"
check_file "$ROOT/functions/_middleware.js"

# Marker so deploy logs confirm the bundle is complete
echo "build=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DEST/.pages-build"
check_file "$DEST/.pages-build"

check_js_asset() {
  local rel="$1"
  local path="$DEST/$rel"
  if ! head -c 256 "$path" | grep -qE '^[[:space:]]*(//|/\*|import |export |const |let |function )'; then
    echo "Deploy check failed: $rel is not JavaScript (SPA may be serving HTML for missing files)" >&2
    head -3 "$path" >&2
    exit 1
  fi
}

check_js_asset "js/main.js"
check_js_asset "js/lazy.js"
check_js_asset "js/modules/singularity.js"

if [ -d "$DEST/.netlify" ] || [ -d "$DEST/node_modules" ]; then
  echo "Deploy check failed: build tooling leaked into dist/" >&2
  exit 1
fi

if [ -d "$DEST/archive" ] || [ -d "$DEST/scripts" ]; then
  echo "Deploy check failed: dev-only paths leaked into dist/" >&2
  exit 1
fi

if [ -f "$DEST/js/ios-pingpong.js" ]; then
  echo "Deploy check failed: stale js/ios-pingpong.js in dist/ (use js/pong.js)" >&2
  exit 1
fi

if ! grep -q "from './game/pong.js'" "$DEST/js/main.js" || ! grep -q "from '../game/pong.js'" "$DEST/js/ios/ios-ui.js"; then
  echo "Deploy check failed: dist bundle must import game/pong.js from main.js and ios-ui.js" >&2
  exit 1
fi

if ! grep -q 'let panopticonPongInitialized = false' "$DEST/js/game/pong.js"; then
  echo "Deploy check failed: js/game/pong.js missing panopticonPongInitialized guard" >&2
  exit 1
fi

if ! grep -q 'z-index: 10020' "$DEST/css/style.css"; then
  echo "Deploy check failed: dist/css/style.css missing app-chrome z-index fix" >&2
  exit 1
fi

if ! grep -q 'wheelConicGradient' "$DEST/js/modules/matrix.js"; then
  echo "Deploy check failed: dist/js/modules/matrix.js missing cipher wheel gradient" >&2
  exit 1
fi

if grep -q 'setTimeout(showPongArmingHint' "$DEST/js/game/pong.js"; then
  echo "Deploy check failed: dist/js/game/pong.js still auto-shows pong arming hint" >&2
  exit 1
fi

SW_VER="$(grep -E "const CACHE_VERSION = " "$ROOT/sw.js" | head -1)"
if ! grep -qF "$SW_VER" "$DEST/sw.js"; then
  echo "Deploy check failed: dist/sw.js out of sync with source (re-run scripts/deploy/cloudflare.sh)" >&2
  exit 1
fi

# Portable on macOS + Cloudflare Linux (avoid stat -f vs -c differences).
SIZE_KIB=$(du -sk "$DEST" | awk '{print $1}')
SIZE_BYTES=$((SIZE_KIB * 1024))
SIZE_MIB=$((SIZE_KIB / 1024))
log "Bundle size: ${SIZE_MIB} MiB ($(find "$DEST" -type f | wc -l | tr -d ' ') files)"

if [ "$SIZE_MIB" -gt "$MAX_MIB" ]; then
  echo "Deploy bundle too large: ${SIZE_MIB} MiB (max ${MAX_MIB} MiB)." >&2
  exit 1
fi

log "Build finished successfully."
echo "Cloudflare Pages bundle: $DEST (${SIZE_MIB} MiB)"
echo ""
echo "Deploy (recommended — uploads _headers/_redirects as config metadata):"
echo "  npm install && npm run deploy"
echo ""
echo "Git-connected Pages settings:"
echo "  Build command:  bash scripts/deploy/cloudflare.sh"
echo "  Build output:   dist"
echo "  Root directory: (leave blank)"
echo ""
echo "IMPORTANT — Cloudflare Pages:"
echo "  • Build output directory MUST be: dist"
echo "  • Not found behavior: use 404 page (404.html) — NOT Single Page Application"
echo "    (SPA serves index.html for /js/modules/*.js → singularity import fails)"
echo "  • _headers / _redirects / _routes.json are config — not in the file list"
echo "  • functions/_middleware.js sets JS MIME types if _headers is skipped"
