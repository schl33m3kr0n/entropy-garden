#!/usr/bin/env bash
# Build dist/ (same bundle Cloudflare Pages publishes) and serve it locally.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8765}"

while lsof -iTCP:"$PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

bash "$ROOT/scripts/deploy-cloudflare.sh"

echo ""
echo "Serving Cloudflare bundle: $ROOT/dist"
echo "Local:  http://localhost:$PORT"
echo "Build:  $(cat "$ROOT/dist/.pages-build" 2>/dev/null || echo unknown)"
echo "Cache:  $(grep -E "const CACHE_VERSION" "$ROOT/dist/sw.js" | head -1)"
echo ""

cd "$ROOT/dist"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
