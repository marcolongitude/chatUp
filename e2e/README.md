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
npm run test:guardrails      # REQUIRED gate: Go + Jest ROI + family security API
npm run test:guardrails:unit # fast local (no staging network)
npm run hooks:install        # enable git pre-push guardrails

npm run e2e:pair          # smoke + pair tests
npm run e2e:pair:smoke    # smoke only
npm run e2e:pair:notify   # notification + delivery ticks (high ROI)
npm run e2e:family:security  # API-only family privacy (anti destination leak)
npm run e2e:family:ui        # dual-device opens Modo família in Settings
npm run test:family          # Go unit: nearby family strip/grace contracts
npm run e2e:pair -- -k reply   # subset
npm run test:notify       # unit: status mapping + local notification logic
```

### Automatic gates

| Gate | When | What runs |
|------|------|-----------|
| GitHub Actions `guardrails.yml` | push/PR → `developer`/`main` | Go + Jest + family security API |
| `.githooks/pre-push` | `git push` (after `npm run hooks:install`) | `npm run test:guardrails` |
| Cursor `stop` hook | agent edited files in the session | same full guardrails; asks agent to fix on fail |

Device suites (`e2e:pair:*`, `e2e:family:ui`) stay manual / local — they need USB+emulator.

### Family security harness (important)

`tests/test_family_security_api.py` is intentionally strict:

| Case | Must hold |
|------|-----------|
| Family accepted, location share off | nearby peer has **no** `location` / coords |
| Only one side enables share | still **no** coords |
| Both enable share | coords allowed between the pair |
| Peer leaves perimeter, share off | stays on list with `inGrace` and **no** coords |
| After grace expiry (DB backdate) | peer disappears from list |
| Mutual share + leave perimeter | peer drops immediately (no grace) |
| Family revoked while in grace | peer drops immediately |

Grace expiry uses `kubectl exec` into staging Postgres (`nearby_presence` backdate). If kubectl is unavailable, that single assertion is skipped — all leak checks still run.

`FAMILY_GRACE_SECONDS` (backend env, default `1800`) is only for controlled test overrides — do **not** lower it on shared staging without coordinating.

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
