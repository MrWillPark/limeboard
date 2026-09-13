#!/usr/bin/env bash
# Day-0 gate: probe OpenRouter browser CORS from burnline.dev origin.
# Usage: ./cors-probe.sh
# Expect: access-control-allow-origin: * and Authorization in allow-headers.
set -euo pipefail

ORIGIN="${ORIGIN:-https://burnline.dev}"
BASE="https://openrouter.ai/api/v1"

probe() {
  local path="$1"
  echo "=== OPTIONS $path ==="
  curl -sS -D - -o /dev/null \
    -X OPTIONS "${BASE}${path}" \
    -H "Origin: ${ORIGIN}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization,content-type" \
    | grep -iE 'HTTP/|access-control-' || true
  echo
  echo "=== GET $path (no auth; expect 401 + ACAO) ==="
  curl -sS -D - -o /dev/null \
    -X GET "${BASE}${path}" \
    -H "Origin: ${ORIGIN}" \
    -H "Content-Type: application/json" \
    | grep -iE 'HTTP/|access-control-' || true
  echo
}

probe /key
probe /credits

echo "Gate: if ACAO is * (or includes burnline.dev) and Authorization is allowed, live web forecast is viable."
echo "If blocked: ship forecast UI with CLI fallback — do not add a Burnline key proxy."
