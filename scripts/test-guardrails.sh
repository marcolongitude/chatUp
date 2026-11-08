#!/usr/bin/env bash
# ChatUp security / flow guardrails.
# Unit suite always runs. Family API anti-leak suite runs unless --unit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"
cd "$ROOT"

# Non-interactive runs (and shells that still point at a removed nvm
# version) do not have node/npm/npx on PATH. Guardrails must find them.
ensure_node_on_path() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
    return 0
  fi
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  local bin=""
  if [[ -f "$nvm_dir/alias/default" ]]; then
    local ver
    ver="$(tr -d '[:space:]' < "$nvm_dir/alias/default")"
    ver="${ver#v}"
    if [[ -x "$nvm_dir/versions/node/v${ver}/bin/node" && -x "$nvm_dir/versions/node/v${ver}/bin/npx" ]]; then
      bin="$nvm_dir/versions/node/v${ver}/bin"
    fi
  fi
  if [[ -z "$bin" && -d "$nvm_dir/versions/node" ]]; then
    local candidate
    for candidate in "$nvm_dir"/versions/node/v*/bin; do
      if [[ -x "$candidate/node" && -x "$candidate/npx" ]]; then
        bin="$candidate"
      fi
    done
  fi
  if [[ -n "$bin" ]]; then
    export PATH="$bin:$PATH"
  fi
}
ensure_node_on_path

MODE="full"
for arg in "$@"; do
  case "$arg" in
    --unit) MODE="unit" ;;
    --full) MODE="full" ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/test-guardrails.sh [--unit|--full]

  --unit  Go app + Jest ROI only (no API)
  --full  unit + family security API against a local backend (default)
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
if (cd "$MOBILE" && node ./node_modules/jest/bin/jest.js --testPathPattern='(delivery-status|notifications|MessageStatus|stableLib|perimeter|outbox)' --no-coverage); then
  echo "OK jest"
else
  echo "FAIL jest"
  fail=1
fi

if [[ "$MODE" == "full" ]]; then
  section "Local API (family security does not use the public staging host)"
  # shellcheck disable=SC1091
  if source "$ROOT/scripts/ensure-guardrail-api.sh"; then
    echo "OK local-api ${CHATUP_E2E_API_URL}"
  else
    echo "FAIL local-api"
    fail=1
  fi

  if [[ "$fail" -eq 0 ]]; then
    section "Family security API (anti destination leak)"
    if (
      cd "$MOBILE" &&
        CHATUP_E2E_API_URL="$CHATUP_E2E_API_URL" \
        CHATUP_E2E_POSTGRES_CONTAINER="$CHATUP_E2E_POSTGRES_CONTAINER" \
        npm run e2e:family:security
    ); then
      echo "OK family-security"
    else
      echo "FAIL family-security"
      fail=1
    fi
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
