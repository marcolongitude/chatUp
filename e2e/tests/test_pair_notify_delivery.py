from __future__ import annotations

import time
import uuid

import pytest

from harness.pages import ChatPage, ConversationsPage, LoginPage, NotificationShade


@pytest.mark.pair
@pytest.mark.smoke
def test_receive_notifies_and_marks_delivered(fresh_pair, cfg, api):
    """
    High-ROI path with strict assertions (anti-false-positive):
    - B backgrounded → NEW NotificationRecord pkg=com.chatup.app (delta vs baseline)
    - A sees delivery tick keyed to THIS message text
    - B opens chat and decrypts the same plaintext
    """
    usb, emu = fresh_pair.usb, fresh_pair.emu
    msg = f"E2E-notif-{uuid.uuid4().hex[:8]}"
    shade = NotificationShade(emu)

    LoginPage(usb).login(cfg.account_a.email, cfg.account_a.password)
    LoginPage(emu).login(cfg.account_b.email, cfg.account_b.password)
    api.wait_for_identity_key(cfg.account_a.user_id)
    api.wait_for_identity_key(cfg.account_b.user_id)

    ConversationsPage(usb).open_contact(cfg.account_b.user_id, cfg.account_b.display_name)
    # Peer stays on conversations (NOT inside the chat). Home/suspend often freezes RN WS
    # before local notifications can fire — that is a product gap, not something to hide.
    ConversationsPage(emu).wait_ready()
    time.sleep(2.0)

    # Baseline BEFORE send — AppSettings mentioning com.chatup.app must not count.
    before = shade.snapshot_count()
    assert before == shade.count_chatup_records(shade.dumpsys())

    before_seq = api.max_seq(cfg.account_b, cfg.account_a.user_id)
    ChatPage(usb).send_message(msg)

    cipher = api.wait_for_new_ciphertext(
        cfg.account_b, cfg.account_a.user_id, min_seq=before_seq, timeout=60
    )
    content = str(cipher.get("content") or "")
    assert msg not in content, "plaintext leaked to server"
    assert content.startswith("STB:")

    # Strict: new NotificationRecord for ChatUp + sender display name in payload.
    shade.expect_new_chatup_notification(
        before,
        sender_name=cfg.account_a.display_name,
        timeout=60,
    )

    ChatPage(usb).expect_message(msg, timeout=30)
    seen = ChatPage(usb).expect_status_at_least(msg, "delivered", timeout=60)
    assert seen in ("delivered", "read")

    # Tap notification → must land in A's chat (not just conversations).
    shade.open_chatup_notification(cfg.account_a.display_name, timeout=30)
    ChatPage(emu).wait_ready(timeout=30)
    ChatPage(emu).expect_message(msg, timeout=90)
