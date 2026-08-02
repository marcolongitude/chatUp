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
    return DevicePair(
        usb_serial=usb,
        emu_serial=emu,
        usb=u2.connect(usb),
        emu=u2.connect(emu),
    )


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


def dismiss_system_dialogs(d: u2.Device) -> None:
    """Close permission / password-manager sheets that block the app."""
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
        ):
            if d(textContains=contains).exists:
                for label in ("Cancelar", "Cancel", "Nunca", "Never", "Não"):
                    if d(text=label).exists:
                        d(text=label).click()
                        clicked = True
                        time.sleep(0.5)
                        break
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
    d.app_stop(package)
    d.app_clear(package)
    grant_runtime_permissions(serial, package)
    d.app_start(package)
    time.sleep(3)
    dismiss_system_dialogs(d)
    # App may still flash a prompt once; dismiss again after bundle load.
    time.sleep(5)
    dismiss_system_dialogs(d)


def relaunch(d: u2.Device, package: str) -> None:
    d.app_stop(package)
    d.app_start(package)
    time.sleep(2)
    dismiss_system_dialogs(d)
