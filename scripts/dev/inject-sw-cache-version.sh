#!/usr/bin/env bash
# Inject git-derived CACHE_VERSION into sw.js (source keeps __EG_CACHE_VERSION__ placeholder).
set -euo pipefail

TARGET="${1:?usage: inject-sw-cache-version.sh <path/to/sw.js>}"

if [ ! -f "$TARGET" ]; then
  echo "inject-sw-cache-version: missing $TARGET" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GIT_HASH="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
DIRTY=""
if ! git -C "$ROOT" diff --quiet 2>/dev/null || ! git -C "$ROOT" diff --cached --quiet 2>/dev/null; then
  DIRTY="-dirty"
fi

CACHE_VERSION="entropy-garden-${GIT_HASH}${DIRTY}"

if grep -q '__EG_CACHE_VERSION__' "$TARGET"; then
  sed "s/__EG_CACHE_VERSION__/${CACHE_VERSION}/g" "$TARGET" > "${TARGET}.tmp"
  mv "${TARGET}.tmp" "$TARGET"
else
  sed "s/const CACHE_VERSION = '[^']*'/const CACHE_VERSION = '${CACHE_VERSION}'/" "$TARGET" > "${TARGET}.tmp"
  mv "${TARGET}.tmp" "$TARGET"
fi

echo "sw.js CACHE_VERSION=${CACHE_VERSION}"
