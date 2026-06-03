#!/usr/bin/env bash
# Cloudflare Pages build entry (legacy path). Delegates to scripts/deploy/cloudflare.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "==> Running scripts/deploy/cloudflare.sh"
exec bash "$ROOT/scripts/deploy/cloudflare.sh"
