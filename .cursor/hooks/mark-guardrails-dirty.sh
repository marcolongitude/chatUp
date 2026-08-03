#!/usr/bin/env bash
# Mark workspace dirty so stop-guardrails runs after agent edits.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$ROOT/.cursor/.guardrails-dirty"
mkdir -p "$ROOT/.cursor"
date -u +%Y-%m-%dT%H:%M:%SZ >"$MARKER"
echo '{}'
exit 0
