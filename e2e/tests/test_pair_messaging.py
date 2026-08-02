from __future__ import annotations

import uuid

import pytest

from harness.pages import ChatPage, ConversationsPage, LoginPage


@pytest.mark.pair
@pytest.mark.smoke
def test_usb_sends_emulator_receives(fresh_pair, cfg, api):
    """Phone (A) -> Emulator (B): encrypt path + decrypt on second client."""
    usb, emu = fresh_pair.usb, fresh_pair.emu
    msg = f"E2E-pair-{uuid.uuid4().hex[:8]}"

    LoginPage(usb).login(cfg.account_a.email, cfg.account_a.password)
    LoginPage(emu).login(cfg.account_b.email, cfg.account_b.password)

    # Both devices must publish StableLib identity before encrypt/decrypt.
    api.wait_for_identity_key(cfg.account_a.user_id)
    api.wait_for_identity_key(cfg.account_b.user_id)

    ConversationsPage(usb).open_contact(cfg.account_b.user_id, cfg.account_b.display_name)
    ConversationsPage(emu).open_contact(cfg.account_a.user_id, cfg.account_a.display_name)

    before_seq = api.max_seq(cfg.account_b, cfg.account_a.user_id)
    ChatPage(usb).send_message(msg)

    cipher = api.wait_for_new_ciphertext(
        cfg.account_b, cfg.account_a.user_id, min_seq=before_seq, timeout=60
    )
    content = str(cipher.get("content") or "")
    assert msg not in content, "plaintext leaked to server"
    assert content.startswith("STB:")

    ChatPage(usb).expect_message(msg, timeout=30)
    ChatPage(emu).expect_message(msg, timeout=90)


@pytest.mark.pair
def test_emulator_replies_usb_receives(fresh_pair, cfg, api):
    """Emulator (B) -> Phone (A): reverse direction on the same pair."""
    usb, emu = fresh_pair.usb, fresh_pair.emu
    msg = f"E2E-reply-{uuid.uuid4().hex[:8]}"

    LoginPage(usb).login(cfg.account_a.email, cfg.account_a.password)
    LoginPage(emu).login(cfg.account_b.email, cfg.account_b.password)
    api.wait_for_identity_key(cfg.account_a.user_id)
    api.wait_for_identity_key(cfg.account_b.user_id)

    ConversationsPage(usb).open_contact(cfg.account_b.user_id, cfg.account_b.display_name)
    ConversationsPage(emu).open_contact(cfg.account_a.user_id, cfg.account_a.display_name)

    before_seq = api.max_seq(cfg.account_a, cfg.account_b.user_id)
    ChatPage(emu).send_message(msg)
    api.wait_for_new_ciphertext(
        cfg.account_a, cfg.account_b.user_id, min_seq=before_seq, timeout=60
    )
    ChatPage(usb).expect_message(msg, timeout=90)
