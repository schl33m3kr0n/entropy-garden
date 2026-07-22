#!/usr/bin/env bash
# Re-encode / resize deploy-facing media. Requires ffmpeg on PATH (or FFMPEG env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FFMPEG="${FFMPEG:-ffmpeg}"
PYTHON="${PYTHON:-python3}"

if ! command -v "$FFMPEG" >/dev/null 2>&1; then
  echo "ffmpeg not found. Install ffmpeg or set FFMPEG=/path/to/ffmpeg" >&2
  exit 1
fi

log() { echo "==> $*"; }

reencode_mp3() {
  local src="$1"
  local bitrate="$2"
  local tmp
  tmp="$(mktemp "${src%.mp3}.XXXXXX.mp3")"
  "$FFMPEG" -y -hide_banner -loglevel error -i "$src" -codec:a libmp3lame -b:a "$bitrate" "$tmp"
  mv "$tmp" "$src"
}

log "Re-encoding birds.mp3 (256k → 96k)"
reencode_mp3 "$ROOT/assets/audio/sfx/birds.mp3" 96k

CARTI="$ROOT/assets/audio/music/playboi carti - 7am (slowed reverb).mp3"
if [ -f "$CARTI" ]; then
  log "Re-encoding playboi carti (320k → 128k)"
  reencode_mp3 "$CARTI" 128k
fi

GENESIS_MOV="$ROOT/assets/video/genesis-web.mov"
GENESIS_MP4="$ROOT/assets/video/genesis-web.mp4"
if [ -f "$GENESIS_MOV" ]; then
  log "Converting genesis-web.mov → genesis-web.mp4"
  "$FFMPEG" -y -hide_banner -loglevel error -i "$GENESIS_MOV" \
    -c:v libx264 -crf 28 -preset slow -an -movflags +faststart "$GENESIS_MP4"
fi

log "Optimizing vault images → WebP"
"$PYTHON" "$ROOT/scripts/compress/optimize-vault-images.py"

UNUSED="$ROOT/assets/video/vault-sphere.mp4"
if [ -f "$UNUSED" ]; then
  log "Removing unused vault-sphere.mp4"
  rm -f "$UNUSED"
fi

log "Media compression complete."
