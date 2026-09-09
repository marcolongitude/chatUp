#!/usr/bin/env bash
# ChatUp security / flow guardrails.
# Unit suite always runs. Family API anti-leak suite runs unless --unit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="full"
for arg in "$@"; do
  case "$arg" in
    --unit) MODE="unit" ;;
    --full) MODE="full" ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/test-guardrails.sh [--unit|--full]

  --unit  Go app + Jest ROI only (no staging network)
  --full  unit + e2e family security API against staging (default)
EOF
      exit 0
      ;;
  esac
done

fail=0

section() {
  echo ""
  echo "======== $* ========"
}

section "Go backend (app / family / nearby / auth / messages)"
if (cd backend-go && go test ./internal/app/ -count=1); then
  echo "OK go"
else
  echo "FAIL go"
  fail=1
fi

section "Jest ROI (notify / status / crypto / perimeter / outbox)"
if npx jest --testPathPattern='(delivery-status|notifications|MessageStatus|stableLib|perimeter|outbox)' --no-coverage; then
  echo "OK jest"
else
  echo "FAIL jest"
  fail=1
fi

if [[ "$MODE" == "full" ]]; then
  section "Family security API (anti destination leak)"
  if npm run e2e:family:security; then
    echo "OK family-security"
  else
    echo "FAIL family-security"
    fail=1
  fi
else
  section "Family security API skipped (--unit)"
fi

echo ""
if [[ "$fail" -ne 0 ]]; then
  echo "GUARDRAILS FAILED"
  exit 1
fi
echo "GUARDRAILS PASSED ($MODE)"
exit 0
