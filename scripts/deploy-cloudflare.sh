#!/usr/bin/env bash
# Cloudflare Pages build entry (legacy path). Delegates to scripts/deploy/cloudflare.sh.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/deploy/cloudflare.sh"
