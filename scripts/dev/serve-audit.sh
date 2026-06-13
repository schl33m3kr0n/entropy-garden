#!/usr/bin/env bash
# Serve cipher glyph audit only — no full dist build required.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8765}"

while lsof -iTCP:"$PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "Cipher glyph audit"
echo "  http://localhost:$PORT/pages/cipher-glyph-audit.html"
echo "  http://localhost:$PORT/cipher-audit  (after deploy with _redirects)"
echo ""
echo "Do not open the HTML file directly (file:// breaks ES module imports)."
echo ""

cd "$ROOT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
