#!/usr/bin/env bash
# After an agent turn that edited files, run security/flow guardrails.
# On failure, ask the agent to fix via followup_message.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$ROOT/.cursor/.guardrails-dirty"
LOG="$ROOT/.cursor/.guardrails-last.log"

input="$(cat || true)"
status="$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("status",""))' 2>/dev/null || true)"
loop_count="$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(int(d.get("loop_count") or 0))' 2>/dev/null || echo 0)"

if [[ "$status" == "aborted" ]]; then
  echo '{}'
  exit 0
fi

if [[ ! -f "$MARKER" ]]; then
  echo '{}'
  exit 0
fi

# Cap automatic repair loops.
if [[ "${loop_count:-0}" -ge 2 ]]; then
  rm -f "$MARKER"
  echo '{}'
  exit 0
fi

cd "$ROOT"
set +e
./scripts/test-guardrails.sh --full >"$LOG" 2>&1
code=$?
set -e

if [[ "$code" -eq 0 ]]; then
  rm -f "$MARKER"
  echo '{}'
  exit 0
fi

python3 - <<'PY'
import json
from pathlib import Path

log = Path(".cursor/.guardrails-last.log")
tail = ""
if log.exists():
    tail = "\n".join(log.read_text(errors="replace").splitlines()[-120:])
msg = (
    "Guardrails de segurança/fluxo falharam após as alterações.\n\n"
    "Corrija a causa raiz e rode `npm run test:guardrails` até passar.\n\n"
    "Log (trecho):\n```text\n" + tail + "\n```\n"
)
print(json.dumps({"followup_message": msg}, ensure_ascii=False))
PY
exit 0
