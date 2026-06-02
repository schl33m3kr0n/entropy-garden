#!/usr/bin/env bash
# Production bundle for Cloudflare Pages (publish dist/ as site output).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/dist"
EXCLUDE_FILE="$ROOT/deploy.exclude"
MAX_MIB=120

rm -rf "$DEST"
mkdir -p "$DEST"

RSYNC=(rsync -a
  --exclude '.git'
  --exclude '.gitignore'
  --exclude '.DS_Store'
  --exclude '.netlify'
  --exclude 'node_modules'
  --exclude 'dist'
  --exclude 'archive'
  --exclude 'scripts'
  --exclude 'docs'
  --exclude 'js/script.js'
  --exclude 'assets/video/genesis-web.mov'
  --exclude 'assets/img/vault/sun-poster.png'
  --exclude 'deploy.exclude'
  --exclude 'deploy.manifest'
  --exclude '.netlifyignore'
  --exclude 'netlify.toml'
  --exclude 'Serve Entropy Garden.command'
  --exclude 'public'
)

if [ -f "$EXCLUDE_FILE" ]; then
  while IFS= read -r pattern || [ -n "$pattern" ]; do
    pattern="${pattern%%$'\r'}"
    pattern="${pattern#"${pattern%%[![:space:]]*}"}"
    pattern="${pattern%"${pattern##*[![:space:]]}"}"
    [ -z "$pattern" ] && continue
    [[ "$pattern" == \#* ]] && continue
    pattern="${pattern#/}"
    pattern="${pattern%/}"
    RSYNC+=(--exclude "$pattern")
  done < "$EXCLUDE_FILE"
fi

"${RSYNC[@]}" "$ROOT/" "$DEST/"

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

check_file "$DEST/index.html"
check_file "$DEST/404.html"
check_file "$DEST/js/main.js"
check_file "$DEST/js/lazy.js"
check_file "$DEST/js/shared.js"
check_file "$DEST/js/modules/matrix.js"
check_file "$DEST/js/modules/arcade.js"
check_file "$DEST/js/pong.js"
check_file "$DEST/js/konami.js"
check_file "$DEST/_headers"
check_file "$DEST/_redirects"
check_file "$DEST/_routes.json"
check_file "$ROOT/functions/_middleware.js"

# Marker so deploy logs confirm the bundle is complete
echo "build=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DEST/.pages-build"
check_file "$DEST/.pages-build"

if [ -d "$DEST/.netlify" ] || [ -d "$DEST/node_modules" ]; then
  echo "Deploy check failed: build tooling leaked into dist/" >&2
  exit 1
fi

if [ -d "$DEST/archive" ] || [ -d "$DEST/scripts" ] || [ -f "$DEST/js/script.js" ]; then
  echo "Deploy check failed: dev-only paths leaked into dist/" >&2
  exit 1
fi

if [ -f "$DEST/js/ios-pingpong.js" ]; then
  echo "Deploy check failed: stale js/ios-pingpong.js in dist/ (use js/pong.js)" >&2
  exit 1
fi

if ! grep -q "from './pong.js'" "$DEST/js/main.js" || ! grep -q "from './pong.js'" "$DEST/js/ios-ui.js"; then
  echo "Deploy check failed: dist bundle must import js/pong.js from main.js and ios-ui.js" >&2
  exit 1
fi

if ! grep -q 'let panopticonPongInitialized = false' "$DEST/js/pong.js"; then
  echo "Deploy check failed: js/pong.js missing panopticonPongInitialized guard" >&2
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

if ! grep -q 'PONG_ARM_HINT_DELAY_MS = 5000' "$DEST/js/pong.js"; then
  echo "Deploy check failed: dist/js/pong.js missing pong arming hint timing" >&2
  exit 1
fi

SW_VER="$(grep -E "const CACHE_VERSION = " "$ROOT/sw.js" | head -1)"
if ! grep -qF "$SW_VER" "$DEST/sw.js"; then
  echo "Deploy check failed: dist/sw.js out of sync with source (run npm run build)" >&2
  exit 1
fi

SIZE_BYTES="$(find "$DEST" -type f -print0 | xargs -0 stat -f%z 2>/dev/null | awk '{s+=$1} END {print s+0}')"
if [ -z "$SIZE_BYTES" ] || [ "$SIZE_BYTES" -eq 0 ]; then
  SIZE_BYTES="$(find "$DEST" -type f -exec stat -c%s {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')"
fi
SIZE_MIB=$((SIZE_BYTES / 1024 / 1024))

if [ "$SIZE_MIB" -gt "$MAX_MIB" ]; then
  echo "Deploy bundle too large: ${SIZE_MIB} MiB (max ${MAX_MIB} MiB)." >&2
  exit 1
fi

echo "Cloudflare Pages bundle: $DEST (${SIZE_MIB} MiB)"
echo ""
echo "Deploy (recommended — uploads _headers/_redirects as config metadata):"
echo "  npm install && npm run deploy"
echo ""
echo "Git-connected Pages settings:"
echo "  Build command:  npm run build"
echo "  Build output:   dist"
echo "  Root directory: (leave blank)"
echo ""
echo "IMPORTANT — Cloudflare Pages:"
echo "  • 404.html in dist disables automatic SPA fallback (/* → index.html)"
echo "  • _headers / _redirects are config metadata — they won't appear in the file list"
echo "  • functions/_middleware.js sets JS MIME types if _headers is skipped"
