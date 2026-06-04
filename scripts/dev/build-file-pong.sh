#!/usr/bin/env bash
# Build archive/legacy/file-pong.bundle.js (obsolete — app uses js/main.js + game/pong.js).
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/archive/legacy/file-pong.bundle.js"
VER=0.25.5

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)  PKG="darwin-arm64" ;;
  Darwin-x86_64) PKG="darwin-x64" ;;
  Linux-x86_64)  PKG="linux-x64" ;;
  Linux-aarch64) PKG="linux-arm64" ;;
  *)
    echo "Unsupported platform for esbuild bootstrap: $(uname -s)-$(uname -m)" >&2
    exit 1
    ;;
esac

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "https://registry.npmjs.org/@esbuild/${PKG}/-/${PKG}-${VER}.tgz" -o "$TMP/t.tgz"
tar -xzf "$TMP/t.tgz" -C "$TMP"
ESB="$TMP/package/bin/esbuild"

cd "$ROOT"
"$ESB" archive/legacy/file-pong-boot.js \
  --bundle \
  --format=iife \
  --global-name=EntropyFilePong \
  --outfile="$OUT" \
  --minify

echo "Built $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
