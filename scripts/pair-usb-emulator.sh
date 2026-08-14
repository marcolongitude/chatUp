#!/usr/bin/env bash
# Pair a physical USB Android device with AVD ChatUp_E2E for dual-client E2E.
# - Starts emulator if needed (AVD: ChatUp_E2E)
# - Installs debug APK on both (optional)
# - Sets adb reverse tcp:8081 on both (shared Metro)
#
# Usage:
#   ./scripts/pair-usb-emulator.sh              # reverse + status
#   ./scripts/pair-usb-emulator.sh --install    # install APK on USB + emulator
#   ./scripts/pair-usb-emulator.sh --install-emu # install APK only on emulator
#   ./scripts/pair-usb-emulator.sh --start-emu  # start AVD if offline
#   ./scripts/pair-usb-emulator.sh --launch     # open app on both
#
# Emulator (x86_64) needs a debug APK built with that ABI, e.g.:
#   cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
# Phone (arm64) needs arm64; do not overwrite the USB device with an x86_64-only APK.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AVD_NAME="${AVD_NAME:-ChatUp_E2E}"
PACKAGE="${PACKAGE:-com.chatup.app}"
APK="${APK:-$ROOT/android/app/build/outputs/apk/debug/app-debug.apk}"
METRO_PORT="${METRO_PORT:-8081}"

# Prefer system SDK emulator if present (Ubuntu package /usr/lib/android-sdk)
if [[ -d /usr/lib/android-sdk/emulator ]]; then
  export ANDROID_HOME="${ANDROID_HOME:-/usr/lib/android-sdk}"
elif [[ -d "$HOME/Android/Sdk" ]]; then
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
fi
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="${ANDROID_HOME}/emulator:${ANDROID_HOME}/platform-tools:${PATH}"

DO_INSTALL=0
DO_INSTALL_EMU=0
DO_START=0
DO_LAUNCH=0
for arg in "$@"; do
  case "$arg" in
    --install) DO_INSTALL=1 ;;
    --install-emu) DO_INSTALL_EMU=1 ;;
    --start-emu|--start) DO_START=1 ;;
    --launch) DO_LAUNCH=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

require_cmd adb

usb_serial() {
  adb devices | awk '/device$/ && $1 !~ /emulator/{print $1; exit}'
}

emu_serial() {
  adb devices | awk '/emulator/ && /device$/{print $1; exit}'
}

wait_boot() {
  local serial="$1" i
  for i in $(seq 1 90); do
    local state boot
    state="$(adb devices | awk -v s="$serial" '$1==s{print $2}')"
    boot="$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
    if [[ "$state" == "device" && "$boot" == "1" ]]; then
      return 0
    fi
    sleep 5
  done
  echo "timeout waiting for boot: $serial" >&2
  return 1
}

start_emulator_if_needed() {
  if [[ -n "$(emu_serial)" ]]; then
    echo "emulator already up: $(emu_serial)"
    return 0
  fi
  require_cmd emulator
  if ! emulator -list-avds 2>/dev/null | grep -qx "$AVD_NAME"; then
    echo "AVD not found: $AVD_NAME" >&2
    echo "create with: avdmanager create avd -n $AVD_NAME -k 'system-images;android-35;google_apis;x86_64' -d pixel_6" >&2
    exit 1
  fi
  # 3GB userdata fits tight disks; override via env if needed
  local cfg="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"
  if [[ -f "$cfg" ]]; then
    python3 - <<PY
from pathlib import Path
import re
p = Path("$cfg")
t = p.read_text()
t2 = re.sub(r"disk\.dataPartition\.size = .*", "disk.dataPartition.size = 3221225472", t)
if t2 != t:
    p.write_text(t2)
    print("set disk.dataPartition.size=3GB")
PY
  fi
  echo "starting AVD $AVD_NAME ..."
  nohup emulator -avd "$AVD_NAME" -gpu swiftshader_indirect -no-boot-anim -no-snapshot \
    -netdelay none -netspeed full >/tmp/chatup-emulator.log 2>&1 &
  echo "emulator_pid=$! log=/tmp/chatup-emulator.log"
  # Wait until any emulator appears
  for i in $(seq 1 60); do
    local s
    s="$(adb devices | awk '/emulator/{print $1; exit}')"
    if [[ -n "$s" ]]; then
      wait_boot "$s"
      return 0
    fi
    if grep -q '^FATAL' /tmp/chatup-emulator.log 2>/dev/null; then
      echo "emulator failed:" >&2
      tail -20 /tmp/chatup-emulator.log >&2
      exit 1
    fi
    sleep 5
  done
  echo "emulator did not appear in adb" >&2
  exit 1
}

USB="$(usb_serial || true)"
if [[ -z "${USB:-}" ]]; then
  echo "no USB device in 'adb devices' (enable USB debugging)" >&2
  adb devices -l
  exit 1
fi

if [[ "$DO_START" -eq 1 ]] || [[ -z "$(emu_serial || true)" ]]; then
  if [[ -z "$(emu_serial || true)" ]]; then
    start_emulator_if_needed
  fi
fi

EMU="$(emu_serial || true)"
if [[ -z "${EMU:-}" ]]; then
  echo "no emulator online. re-run with --start-emu" >&2
  adb devices -l
  exit 1
fi

echo "USB=$USB"
echo "EMU=$EMU"

if [[ "$DO_INSTALL" -eq 1 || "$DO_INSTALL_EMU" -eq 1 ]]; then
  if [[ ! -f "$APK" ]]; then
    echo "APK missing: $APK" >&2
    echo "build emulator: cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64" >&2
    exit 1
  fi
  if [[ "$DO_INSTALL" -eq 1 ]]; then
    echo "installing on USB + emulator: $APK"
    adb -s "$USB" install -r "$APK"
    adb -s "$EMU" install -r "$APK"
  else
    echo "installing on emulator only: $APK"
    adb -s "$EMU" install -r "$APK"
  fi
fi

echo "adb reverse tcp:${METRO_PORT} on both ..."
adb -s "$USB" reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}"
adb -s "$EMU" reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}"

# Emulator GPS near FE DEV mock in use-location.ts
adb -s "$EMU" emu geo fix -50.920879 -17.803677 >/dev/null 2>&1 || true

if [[ "$DO_LAUNCH" -eq 1 ]]; then
  adb -s "$USB" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
  adb -s "$EMU" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
fi

if curl -sf "http://127.0.0.1:${METRO_PORT}/status" >/dev/null 2>&1; then
  echo "metro: :${METRO_PORT} ok"
else
  echo "warn: Metro not listening on :${METRO_PORT} — start with: npx expo start --port ${METRO_PORT}"
fi

echo
echo "pair ready"
echo "  phone:     $USB  -> login e2e-device-a@chatup.test"
echo "  emulator:  $EMU  -> login e2e-peer-b@chatup.test"
echo "  password:  E2eTest123!"
echo "  note: __DEV__ uses shared location mock so both appear nearby"
adb devices -l
echo "reverse USB:"; adb -s "$USB" reverse --list
echo "reverse EMU:"; adb -s "$EMU" reverse --list
