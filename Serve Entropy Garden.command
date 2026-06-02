#!/bin/bash
cd "$(dirname "$0")" || exit 1

PORT=8765
while lsof -iTCP:"$PORT" -sTCP:LISTEN -Pn >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

IP="$(ipconfig getifaddr en0 2>/dev/null)"
if [ -z "$IP" ]; then
  IP="$(ipconfig getifaddr en1 2>/dev/null)"
fi

PHONE_URL="http://${IP:-YOUR-MAC-IP}:${PORT}"
MAC_URL="http://localhost:${PORT}"

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       ENTROPY GARDEN — LOCAL SERVER      ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Mac:     ${MAC_URL}"
echo ""
if [ -n "$IP" ]; then
  echo "  iPhone:  ${PHONE_URL}"
  echo ""
  echo "  1. iPhone on same Wi-Fi"
  echo "  2. Safari → paste URL (already copied)"
  echo "  3. Tap INITIALIZE"
  echo ""
  printf '%s' "$PHONE_URL" | pbcopy
  echo "  ✓ iPhone URL copied to clipboard"
else
  echo "  iPhone:  connect Mac to Wi-Fi, re-run this script"
  echo ""
fi
echo ""
echo "  Leave this window open. Ctrl+C to stop."
echo ""

open "$MAC_URL" 2>/dev/null || true
exec python3 -m http.server "$PORT" --bind 0.0.0.0
