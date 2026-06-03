#!/usr/bin/env bash
# Production bundle for Netlify (bash + rsync only — no Python required).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/dist"
EXCLUDE_FILE="$ROOT/deploy.exclude"
MAX_MIB=120

rm -rf "$DEST"
mkdir -p "$DEST"

# Always exclude these — do not rely on deploy.exclude being present in the remote repo.
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

if [ -f "$ROOT/_headers" ]; then
  cp "$ROOT/_headers" "$DEST/_headers"
fi

check_file() {
  if [ ! -f "$1" ]; then
    echo "Deploy check failed: missing $1" >&2
    exit 1
  fi
}

check_file "$DEST/index.html"
check_file "$DEST/js/main.js"
check_file "$DEST/js/lazy.js"
check_file "$DEST/js/shared.js"
check_file "$DEST/js/modules/matrix.js"
check_file "$DEST/js/pong.js"

if [ -f "$DEST/js/ios-pingpong.js" ]; then
  echo "Deploy check failed: stale js/ios-pingpong.js in dist/ (use js/pong.js)" >&2
  exit 1
fi

if ! grep -q "from './pong.js'" "$DEST/js/main.js" || ! grep -q "from './pong.js'" "$DEST/js/ios-ui.js"; then
  echo "Deploy check failed: dist bundle must import js/pong.js from main.js and ios-ui.js" >&2
  exit 1
fi

if [ -d "$DEST/.netlify" ] || [ -d "$DEST/node_modules" ]; then
  echo "Deploy check failed: build tooling leaked into dist/ (.netlify or node_modules)" >&2
  exit 1
fi

if [ -d "$DEST/archive" ] || [ -d "$DEST/scripts" ] || [ -f "$DEST/js/script.js" ]; then
  echo "Deploy check failed: dev-only paths leaked into dist/" >&2
  exit 1
fi

SIZE_BYTES="$(find "$DEST" -type f -print0 | xargs -0 stat -f%z 2>/dev/null | awk '{s+=$1} END {print s+0}')"
if [ -z "$SIZE_BYTES" ] || [ "$SIZE_BYTES" -eq 0 ]; then
  SIZE_BYTES="$(find "$DEST" -type f -exec stat -c%s {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')"
fi
SIZE_MIB=$((SIZE_BYTES / 1024 / 1024))

if [ "$SIZE_MIB" -gt "$MAX_MIB" ]; then
  echo "Deploy bundle too large: ${SIZE_MIB} MiB (max ${MAX_MIB} MiB)." >&2
  echo "Largest files:" >&2
  find "$DEST" -type f -exec du -h {} + 2>/dev/null | sort -hr | head -10 >&2
  exit 1
fi

echo "Deploy bundle: $DEST (${SIZE_MIB} MiB)"
