from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass

import uiautomator2 as u2


@dataclass(frozen=True)
class DevicePair:
    usb_serial: str
    emu_serial: str
    usb: u2.Device
    emu: u2.Device


def _adb_devices() -> list[tuple[str, str]]:
    out = subprocess.check_output(["adb", "devices"], text=True)
    rows: list[tuple[str, str]] = []
    for line in out.splitlines()[1:]:
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            rows.append((parts[0], parts[1]))
    return rows


def discover_pair() -> tuple[str, str]:
    usb: str | None = None
    emu: str | None = None
    for serial, state in _adb_devices():
        if state != "device":
            continue
        if serial.startswith("emulator-"):
            emu = emu or serial
        else:
            usb = usb or serial
    if not usb or not emu:
        raise RuntimeError(
            f"need USB + emulator online; got usb={usb!r} emu={emu!r}. "
            "Run: npm run pair:usb-emulator -- --start-emu"
        )
    return usb, emu


def adb_reverse(serial: str, port: int) -> None:
    subprocess.check_call(
        ["adb", "-s", serial, "reverse", f"tcp:{port}", f"tcp:{port}"]
    )


def ensure_metro_reverse(usb: str, emu: str, port: int) -> None:
    adb_reverse(usb, port)
    adb_reverse(emu, port)


def connect_pair(metro_port: int = 8081) -> DevicePair:
    usb, emu = discover_pair()
    ensure_metro_reverse(usb, emu, metro_port)
    pair = DevicePair(
        usb_serial=usb,
        emu_serial=emu,
        usb=u2.connect(usb),
        emu=u2.connect(emu),
    )
    # QEMU exposes "AT Translated Set 2 keyboard" → Settings spam + shade noise.
    silence_emulator_keyboard_noise(pair.emu)
    return pair


def silence_emulator_keyboard_noise(d: u2.Device, *, leave_app: bool = False) -> None:
    """Stop API 35 physical-keyboard setup loop on AVD (AT Translated Set 2).

    Never press Home by default — that kicked ChatUp to launcher during login waits
    and made ensure_login_screen loop until timeout (false 'stuck' failures).
    """
    if not str(d.serial).startswith("emulator-"):
        return
    try:
        d.shell(
            "ime set com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME"
        )
        d.shell("settings put secure show_ime_with_hard_keyboard 1")
        d.shell(
            "settings put secure default_input_method "
            "com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME"
        )
        # Year-long snooze of the "Configure AT Translated Set 2 keyboard" notif (id=19).
        d.shell("cmd notification snooze --for 31536000000 '-1|android|19|null|1000'")
        d.shell("cmd statusbar collapse")
        if leave_app:
            d.press("home")
    except Exception:  # noqa: BLE001
        pass


RUNTIME_PERMISSIONS = (
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_BACKGROUND_LOCATION",
)


def grant_runtime_permissions(serial: str, package: str) -> None:
    for perm in RUNTIME_PERMISSIONS:
        subprocess.run(
            ["adb", "-s", serial, "shell", "pm", "grant", package, perm],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def dismiss_dev_overlays(d: u2.Device) -> None:
    """Dismiss RN LogBox / error toasts that cover the tab bar in __DEV__."""
    for _ in range(4):
        dismissed = False
        for label in ("Dismiss", "Minimize", "Hide", "Dispensar", "OK"):
            if d(text=label).exists:
                d(text=label).click()
                dismissed = True
                time.sleep(0.3)
        # LogBox collapsed banner often exposes a content-desc starting with "!,".
        for el in d(descriptionStartsWith="!,"):
            if el.exists:
                try:
                    # Tap the right edge (often the dismiss control).
                    info = el.info.get("bounds") or {}
                    right = int(info.get("right", 0))
                    top = int(info.get("top", 0))
                    bottom = int(info.get("bottom", 0))
                    if right and bottom > top:
                        d.click(max(right - 40, 0), (top + bottom) // 2)
                        dismissed = True
                        time.sleep(0.3)
                except Exception:  # noqa: BLE001
                    pass
        if d(textContains="useActionState").exists or d(textContains="LogBox").exists:
            d.press("back")
            dismissed = True
            time.sleep(0.3)
        if not dismissed:
            break


def dismiss_system_dialogs(d: u2.Device) -> None:
    """Close permission / password-manager sheets that block the app."""
    dismiss_dev_overlays(d)
    for _ in range(6):
        clicked = False
        for text in (
            "Allow",
            "While using the app",
            "ONLY THIS TIME",
            "Only this time",
            "Permitir",
            "Durante o uso do app",
            "Somente desta vez",
            # Samsung Pass / Google password save prompts
            "Cancelar",
            "Cancel",
            "Nunca",
            "Never",
            "Não",
            "Not now",
            "No thanks",
            "Nunca usar Samsung Pass para este aplicativo",
        ):
            el = d(text=text)
            if el.exists:
                el.click()
                clicked = True
                time.sleep(0.5)
        for contains in (
            "Samsung Pass",
            "salvar senha",
            "save password",
            "Save password",
            "AT Translated Set 2",
            "Physical keyboard",
            "Configure AT Translated",
        ):
            if d(textContains=contains).exists:
                for label in ("Cancelar", "Cancel", "Nunca", "Never", "Não", "Done", "OK"):
                    if d(text=label).exists:
                        d(text=label).click()
                        clicked = True
                        time.sleep(0.5)
                        break
                else:
                    # Leave keyboard settings if they stole focus
                    if "keyboard" in contains.lower() or "AT Translated" in contains:
                        d.press("back")
                        clicked = True
                        time.sleep(0.3)
        for rid in (
            "com.android.permissioncontroller:id/permission_allow_button",
            "com.android.permissioncontroller:id/permission_allow_foreground_only_button",
            "com.android.permissioncontroller:id/permission_allow_one_time_button",
        ):
            el = d(resourceId=rid)
            if el.exists:
                el.click()
                clicked = True
                time.sleep(0.5)
        if not clicked:
            break


def reset_and_launch(d: u2.Device, package: str, serial: str | None = None) -> None:
    serial = serial or d.serial
    silence_emulator_keyboard_noise(d)
    d.app_stop(package)
    d.app_clear(package)
    grant_runtime_permissions(serial, package)
    d.app_start(package)
    time.sleep(3)
    dismiss_system_dialogs(d)
    silence_emulator_keyboard_noise(d)
    # App may still flash a prompt once; dismiss again after bundle load.
    time.sleep(5)
    dismiss_system_dialogs(d)
    silence_emulator_keyboard_noise(d)


def relaunch(d: u2.Device, package: str) -> None:
    d.app_stop(package)
    d.app_start(package)
    time.sleep(2)
    dismiss_system_dialogs(d)
