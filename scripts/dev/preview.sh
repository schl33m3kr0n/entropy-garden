#!/usr/bin/env bash
# Serve the working tree for local preview (not the Cloudflare dist/ bundle).
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8765}"
HOST="${HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/"

cd "$ROOT"

already_listening() {
    lsof -iTCP:"$PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1
}

echo "Serving working tree: $ROOT"
echo "Local:  $URL"

if already_listening; then
    echo "Already listening on :$PORT"
    exec sleep infinity
fi

if python3 -c 'print(1)' >/dev/null 2>&1; then
    exec python3 -m http.server "$PORT" --bind "$HOST"
fi

if command -v ruby >/dev/null 2>&1; then
    exec ruby -run -e httpd . -p "$PORT" -b "$HOST"
fi

echo "Need python3 or ruby to preview." >&2
exit 1
