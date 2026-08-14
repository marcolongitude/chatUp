#!/usr/bin/env bash
# Dual-device E2E: physical USB + ChatUp_E2E emulator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/e2e"
VENV="${CHATUP_E2E_VENV:-$E2E/.venv}"

export PATH="${ANDROID_HOME:-/usr/lib/android-sdk}/platform-tools:${HOME}/Android/Sdk/platform-tools:${PATH}"

cd "$ROOT"

echo "[e2e] ensuring USB+emulator pair..."
./scripts/pair-usb-emulator.sh --start-emu --launch || ./scripts/pair-usb-emulator.sh --launch

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -U pip
  "$VENV/bin/pip" install -r "$E2E/requirements.txt"
fi

# Init uiautomator2 atx-agent on both devices (idempotent)
USB=$(adb devices | awk '/device$/ && $1 !~ /emulator/{print $1; exit}')
EMU=$(adb devices | awk '/emulator/ && /device$/{print $1; exit}')
if [[ -z "${USB:-}" || -z "${EMU:-}" ]]; then
  echo "USB+emulator required" >&2
  adb devices -l
  exit 1
fi

"$VENV/bin/python" - <<PY
import uiautomator2 as u2
for s in ("$USB", "$EMU"):
    d = u2.connect(s)
    info = d.info
    print("u2 ok", s, info.get("productName") or info.get("serial") or d.serial)
PY

echo "[e2e] metro check :8081"
if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null; then
  echo "Metro not on :8081 — start with: npx expo start --port 8081" >&2
  exit 1
fi
echo "metro ok"

cd "$E2E"
export CHATUP_E2E_AUTO_PAIR=0
exec "$VENV/bin/pytest" "$@"
