"""
Device UI smoke for family settings (consent surfaces).

Heavy privacy assertions live in test_family_security_api.py (API-only).
This suite only checks that both devices can reach the family controls.
"""

from __future__ import annotations

import pytest

from harness.pages import LoginPage, SettingsPage


pytestmark = [pytest.mark.family, pytest.mark.pair]


def test_both_devices_open_family_settings(fresh_pair, cfg):
    usb, emu = fresh_pair.usb, fresh_pair.emu

    LoginPage(usb).login(cfg.account_a.email, cfg.account_a.password)
    LoginPage(emu).login(cfg.account_b.email, cfg.account_b.password)

    SettingsPage(usb).open()
    SettingsPage(usb).expect_family_section()

    SettingsPage(emu).open()
    SettingsPage(emu).expect_family_section()
