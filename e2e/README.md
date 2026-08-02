# ChatUp E2E — USB + Emulator pair

Harness for two-client messaging against staging API:

| Role | Device | Account |
|------|--------|---------|
| A (sender) | USB phone | `e2e-device-a@chatup.test` |
| B (peer) | AVD `ChatUp_E2E` | `e2e-peer-b@chatup.test` |

Password (both): `E2eTest123!`

## Prerequisites

1. Metro on `:8081` (`npx expo start --port 8081`)
2. Debug APKs installed:
   - USB: arm64 (`npx expo run:android` / existing debug)
   - Emulator: x86_64 (`cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64`)
3. Pair helper: `npm run pair:usb-emulator -- --start-emu --launch`
4. JS bundle with `e2e.*` testIDs (served by Metro)

## Run

```bash
npm run e2e:pair          # smoke + pair tests
npm run e2e:pair -- -k reply   # subset
```

Or:

```bash
./e2e/run.sh -m pair
./e2e/run.sh tests/test_pair_messaging.py::test_usb_sends_emulator_receives
```

## Layout

- `harness/` — devices, API seed, page objects (`e2e.*` testIDs)
- `tests/` — pytest scenarios
- `run.sh` — venv + uiautomator2 healthcheck + pytest

## Notes

- `__DEV__` location mock is shared; API seed also `PUT /location` for both users.
- Do not install the x86_64-only APK on the phone.
- Clear-data is used per test (`app_clear`) so login is deterministic.
- Chat send uses DEV deep link `chatup://e2e/chat-send?text=...` (RN controlled inputs ignore plain `adb input text`).
- Samsung Pass / permission dialogs are auto-dismissed in the harness.
