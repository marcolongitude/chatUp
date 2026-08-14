from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from harness.api import StagingApi  # noqa: E402
from harness.config import load_config  # noqa: E402
from harness.devices import connect_pair, reset_and_launch  # noqa: E402


@pytest.fixture(scope="session")
def cfg():
    return load_config()


@pytest.fixture(scope="session")
def api(cfg):
    return StagingApi(cfg)


@pytest.fixture(scope="session")
def pair(cfg):
    # Optional: bring emulator up via shell helper
    if os.environ.get("CHATUP_E2E_AUTO_PAIR", "1") == "1":
        script = ROOT.parent / "scripts" / "pair-usb-emulator.sh"
        if script.exists():
            subprocess.run([str(script)], check=False)
    devices = connect_pair(cfg.metro_port)
    return devices


@pytest.fixture
def fresh_pair(pair, cfg, api):
    """Clear app data on both devices and seed nearby locations via API."""
    api.seed_pair_nearby()
    reset_and_launch(pair.usb, cfg.package, serial=pair.usb_serial)
    reset_and_launch(pair.emu, cfg.package, serial=pair.emu_serial)
    return pair
