#!/usr/bin/env bash
# API-only E2E (no USB/emulator). Use for family security / privacy suites.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"
VENV="${CHATUP_E2E_VENV:-$E2E/.venv}"

cd "$ROOT"

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -U pip
  "$VENV/bin/pip" install -r "$E2E/requirements.txt"
fi

cd "$E2E"
export CHATUP_E2E_AUTO_PAIR=0
exec "$VENV/bin/pytest" -m "family and security" "$@"
