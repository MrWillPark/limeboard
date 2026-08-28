#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_PATH="$ROOT/credentials/AuthKey_HD38GZM6FC.p8"

if [[ ! -f "$KEY_PATH" ]]; then
  echo "app-store-connect-mcp: missing credentials at $KEY_PATH" >&2
  exit 1
fi

export ASC_PRIVATE_KEY_PATH="$KEY_PATH"
export ASC_KEY_ID="${ASC_KEY_ID:-HD38GZM6FC}"
export ASC_ISSUER_ID="${ASC_ISSUER_ID:-f4dd4946-37cb-4ee0-8e32-29e92889cd70}"
export ASC_BUNDLE_ID="${ASC_BUNDLE_ID:-app.limeboard.mobile}"
export ASC_APP_APPLE_ID="${ASC_APP_APPLE_ID:-6805714980}"

exec npx -y -p @abd3lraouf/app-store-connect-mcp@1.2.0 asc-mcp
