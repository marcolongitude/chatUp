from __future__ import annotations

import time
from typing import Optional

import uiautomator2 as u2


def _find(d: u2.Device, test_id: str, timeout: float = 20.0):
    """Resolve RN testID on Android (resourceId or content-desc)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        for kwargs in (
            {"resourceId": test_id},
            {"description": test_id},
            {"text": test_id},
        ):
            el = d(**kwargs)
            if el.exists:
                return el
        # Package-prefixed resource ids
        el = d(resourceIdMatches=f".*{test_id}$")
        if el.exists:
            return el
        time.sleep(0.4)
    raise TimeoutError(f"element not found: {test_id}")


def wait_gone(d: u2.Device, test_id: str, timeout: float = 30.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not d(resourceId=test_id).exists and not d(description=test_id).exists:
            return
        time.sleep(0.4)
    raise TimeoutError(f"element still present: {test_id}")


def wait_text(d: u2.Device, text: str, timeout: float = 30.0) -> None:
    if not d(textContains=text).wait(timeout=timeout):
        raise TimeoutError(f"text not found: {text}")


class LoginPage:
    def __init__(self, d: u2.Device) -> None:
        self.d = d

    def _looks_like_login(self) -> bool:
        if self.d(resourceId="e2e.login.email").exists or self.d(description="e2e.login.email").exists:
            return True
        if self.d(description="e2e.login.submit").exists or self.d(resourceId="e2e.login.submit").exists:
            return True
        if self.d(className="android.widget.EditText").count >= 2:
            for hint in ("Enter your email", "Digite seu", "password", "senha", "Log In", "Entrar"):
                if self.d(textContains=hint).exists:
                    return True
        return False

    def ensure_login_screen(self, timeout: float = 90.0) -> None:
        """Reach login even if app opens main shell with a broken/empty session."""
        from .devices import dismiss_system_dialogs, reset_and_launch, silence_emulator_keyboard_noise

        pkg = "com.chatup.app"
        deadline = time.time() + timeout
        last: Exception | None = None
        hard_reset_done = False
        relaunch_tries = 0
        while time.time() < deadline:
            dismiss_system_dialogs(self.d)
            # Do not press Home here — that races login and strands us on launcher.
            silence_emulator_keyboard_noise(self.d, leave_app=False)
            if self._looks_like_login():
                return

            cur = ""
            try:
                cur = str(self.d.app_current().get("package") or "")
            except Exception:  # noqa: BLE001
                cur = ""

            # App not in foreground (launcher / settings) → bring ChatUp back.
            if cur and cur != pkg and relaunch_tries < 6:
                self.d.app_start(pkg)
                relaunch_tries += 1
                time.sleep(3.0)
                continue

            # Stale shell after app_clear / Keychain leftovers
            for label in ("Logout", "Sair", "Log out"):
                if self.d(text=label).exists:
                    self.d(text=label).click()
                    time.sleep(2.0)
                    dismiss_system_dialogs(self.d)
                    break
            if (
                not hard_reset_done
                and (
                    self.d(textContains="Not authenticated").exists
                    or self.d(textContains="não autenticado").exists
                )
            ):
                reset_and_launch(self.d, pkg, serial=self.d.serial)
                hard_reset_done = True
                continue
            try:
                _find(self.d, "e2e.login.email", timeout=2)
                return
            except Exception as exc:  # noqa: BLE001
                last = exc
            time.sleep(0.5)
        raise TimeoutError(f"login screen not ready: {last}")

    def wait_ready(self, timeout: float = 60.0) -> None:
        self.ensure_login_screen(timeout=timeout)

    def login(self, email: str, password: str) -> None:
        self.wait_ready()
        try:
            email_el = _find(self.d, "e2e.login.email", timeout=5)
        except TimeoutError:
            edits = self.d(className="android.widget.EditText")
            if edits.count < 2:
                raise
            email_el = edits[0]
        email_el.click()
        email_el.set_text(email)

        try:
            pwd_el = _find(self.d, "e2e.login.password", timeout=5)
        except TimeoutError:
            pwd_el = self.d(className="android.widget.EditText")[1]
        pwd_el.click()
        pwd_el.set_text(password)

        # Keyboard / password managers often cover the submit button.
        try:
            self.d.hide_keyboard()
        except Exception:  # noqa: BLE001
            self.d.press("back")
        time.sleep(0.4)
        # Dismiss Samsung/Google password sheets if present
        for label in ("OK", "Não", "Never", "No thanks", "Cancelar", "Cancel"):
            if self.d(text=label).exists:
                self.d(text=label).click()
                time.sleep(0.3)

        clicked = False
        try:
            _find(self.d, "e2e.login.submit", timeout=5).click()
            clicked = True
        except TimeoutError:
            for label in ("Log In", "Entrar", "Login"):
                if self.d(text=label).exists:
                    self.d(text=label).click()
                    clicked = True
                    break
        if not clicked:
            # Last resort: tap lower primary area / swipe up then retry
            self.d.swipe_ext("up", scale=0.6)
            time.sleep(0.3)
            for label in ("Log In", "Entrar", "Login"):
                if self.d(text=label).exists:
                    self.d(text=label).click()
                    clicked = True
                    break
        if not clicked:
            raise TimeoutError("login submit control not found")
        # Wait until conversations (or any post-auth shell) appears
        from .devices import dismiss_system_dialogs

        deadline = time.time() + 60
        while time.time() < deadline:
            dismiss_system_dialogs(self.d)
            if self.d(resourceId="e2e.conversations.screen").exists:
                return
            if self.d(textContains="Conversations").exists or self.d(textContains="Conversas").exists:
                return
            # Logout tab means main shell even if nearby list still loading
            if self.d(text="Logout").exists or self.d(text="Sair").exists:
                return
            time.sleep(0.5)
        raise TimeoutError("login did not reach main shell")


class ConversationsPage:
    def __init__(self, d: u2.Device) -> None:
        self.d = d

    def wait_ready(self, timeout: float = 60.0) -> None:
        from .devices import dismiss_system_dialogs

        deadline = time.time() + timeout
        while time.time() < deadline:
            dismiss_system_dialogs(self.d)
            if self.d(resourceId="e2e.conversations.screen").exists:
                return
            if self.d(textContains="Conversations").exists or self.d(textContains="Conversas").exists:
                return
            if self.d(text="Logout").exists or self.d(text="Sair").exists:
                return
            time.sleep(0.4)
        raise TimeoutError("conversations screen not ready")

    def open_contact(self, user_id: str, display_name: str, timeout: float = 60.0) -> None:
        # Already inside the target chat?
        if self.d(resourceId="e2e.chat.input").exists and self.d(textContains=display_name).exists:
            return
        self.wait_ready(timeout=min(timeout, 30))
        deadline = time.time() + timeout
        last_err: Optional[Exception] = None
        while time.time() < deadline:
            try:
                _find(self.d, f"e2e.contact.{user_id}", timeout=3).click()
                return
            except Exception as exc:  # noqa: BLE001
                last_err = exc
            if self.d(textContains=display_name).exists:
                self.d(textContains=display_name).click()
                return
            time.sleep(1.0)
        raise TimeoutError(
            f"contact not in nearby list: {display_name} ({user_id}); last={last_err}"
        )


class ChatPage:
    def __init__(self, d: u2.Device) -> None:
        self.d = d

    def wait_ready(self, timeout: float = 30.0) -> None:
        _find(self.d, "e2e.chat.input", timeout=timeout)

    def send_message(self, text: str) -> None:
        """Send via DEV deep link so RN controlled state is updated reliably."""
        import subprocess
        import urllib.parse

        self.wait_ready()
        serial = self.d.serial
        url = "chatup://e2e/chat-send?text=" + urllib.parse.quote(text, safe="")
        subprocess.check_call(
            [
                "adb",
                "-s",
                serial,
                "shell",
                "am",
                "start",
                "-a",
                "android.intent.action.VIEW",
                "-d",
                url,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(2.0)

    def go_back(self) -> None:
        # Header back chevron or system back
        if self.d(descriptionContains="back").exists:
            self.d(descriptionContains="back").click()
        elif self.d(resourceIdMatches=".*back.*").exists:
            self.d(resourceIdMatches=".*back.*").click()
        else:
            self.d.press("back")
        time.sleep(1.0)

    def expect_message(self, text: str, timeout: float = 45.0) -> None:
        deadline = time.time() + timeout
        last_err: Exception | None = None
        while time.time() < deadline:
            try:
                wait_text(self.d, text, timeout=3)
                return
            except Exception as exc:  # noqa: BLE001
                last_err = exc
            # Nudge list / pull fresh render
            self.d.swipe_ext("down", scale=0.3)
            time.sleep(0.8)
        raise TimeoutError(f"text not found: {text}; last={last_err}")

    def expect_status_at_least(
        self, message_text: str, minimum: str = "delivered", timeout: float = 45.0
    ) -> str:
        """Wait until THIS message's own tick reaches delivered/read (keyed by text)."""
        order = ("pending", "sent", "delivered", "read")
        if minimum not in order:
            raise ValueError(f"unsupported status: {minimum}")
        min_idx = order.index(minimum)
        acceptable = set(order[min_idx:])
        deadline = time.time() + timeout
        # Row must exist first — avoids matching ticks from older bubbles.
        while time.time() < deadline:
            row = f"e2e.message.row.{message_text}"
            if not (self.d(resourceId=row).exists or self.d(description=row).exists):
                if not self.d(textContains=message_text).exists:
                    time.sleep(0.4)
                    continue
            for status in ("read", "delivered", "sent", "pending", "failed"):
                tid = f"e2e.message.status.{message_text}.{status}"
                if self.d(resourceId=tid).exists or self.d(description=tid).exists:
                    if status in acceptable:
                        return status
                    if status == "failed":
                        raise AssertionError(f"message delivery failed for {message_text}")
            time.sleep(0.5)
        raise TimeoutError(f"status for {message_text!r} not at least {minimum} within {timeout}s")


class NotificationShade:
    """Strict ChatUp notification checks (no AppSettings / ZenPolicy false positives)."""

    def __init__(self, d: u2.Device) -> None:
        self.d = d

    def dumpsys(self) -> str:
        try:
            return self.d.shell("dumpsys notification --noredact").output
        except Exception:  # noqa: BLE001
            return ""

    @staticmethod
    def count_chatup_records(dump: str) -> int:
        """Count real posted NotificationRecords for our package only."""
        import re

        return len(re.findall(r"NotificationRecord\([^)]*pkg=com\.chatup\.app", dump))

    @staticmethod
    def has_chatup_title_record(dump: str, sender_name: str | None = None) -> bool:
        """Require NotificationRecord(pkg=com.chatup.app) with title ChatUp (+ optional sender)."""
        import re

        for match in re.finditer(
            r"NotificationRecord\([^)]*pkg=com\.chatup\.app[\s\S]*?(?=NotificationRecord\(|\Z)",
            dump,
        ):
            block = match.group(0)
            if "android.title=String (ChatUp)" not in block and "title=String (ChatUp)" not in block:
                continue
            if sender_name and sender_name not in block:
                continue
            return True
        return False

    def snapshot_count(self) -> int:
        return self.count_chatup_records(self.dumpsys())

    def expect_new_chatup_notification(
        self,
        before_count: int,
        *,
        sender_name: str,
        timeout: float = 60.0,
    ) -> None:
        """Assert a NEW ChatUp NotificationRecord appeared after the send."""
        deadline = time.time() + timeout
        last_count = before_count
        while time.time() < deadline:
            dump = self.dumpsys()
            last_count = self.count_chatup_records(dump)
            if last_count > before_count and self.has_chatup_title_record(dump, sender_name=sender_name):
                return
            time.sleep(1.0)
        raise TimeoutError(
            f"no new ChatUp NotificationRecord (before={before_count}, after={last_count}, "
            f"sender={sender_name!r})"
        )

    def open_chatup_notification(self, sender_name: str, timeout: float = 30.0) -> None:
        """Pull shade and tap the ChatUp row for this sender (opens the chat)."""
        from .devices import silence_emulator_keyboard_noise

        silence_emulator_keyboard_noise(self.d, leave_app=False)
        deadline = time.time() + timeout
        last_err: Exception | None = None
        while time.time() < deadline:
            try:
                self.d.open_notification()
                time.sleep(1.0)
                # Prefer the body line with the sender name; fall back to title.
                if self.d(textContains=sender_name).exists:
                    self.d(textContains=sender_name).click()
                    time.sleep(2.0)
                    return
                if self.d(textContains="ChatUp").exists:
                    self.d(textContains="ChatUp").click()
                    time.sleep(2.0)
                    return
                last_err = TimeoutError("ChatUp notification row not tappable")
            except Exception as exc:  # noqa: BLE001
                last_err = exc
            try:
                self.d.press("back")
            except Exception:  # noqa: BLE001
                pass
            time.sleep(1.0)
        raise TimeoutError(f"could not open ChatUp notification: {last_err}")


class SettingsPage:
    def __init__(self, d: u2.Device) -> None:
        self.d = d

    def _tap_center(self, test_id: str, timeout: float = 20.0) -> None:
        """
        RN Pressable/TouchableOpacity often ignores UiAutomator .click().
        Coordinate tap via adb is reliable for bottom tabs.
        """
        el = _find(self.d, test_id, timeout=timeout)
        info = el.info
        bounds = info.get("bounds") or {}
        left = int(bounds.get("left", 0))
        top = int(bounds.get("top", 0))
        right = int(bounds.get("right", 0))
        bottom = int(bounds.get("bottom", 0))
        x = (left + right) // 2
        y = (top + bottom) // 2
        # u2 click works on some devices; always follow with shell tap.
        try:
            el.click()
        except Exception:  # noqa: BLE001
            pass
        self.d.shell(f"input tap {x} {y}")

    def open(self, timeout: float = 30.0) -> None:
        from .devices import dismiss_dev_overlays, dismiss_system_dialogs

        dismiss_system_dialogs(self.d)
        dismiss_dev_overlays(self.d)
        self._tap_center("e2e.tab.settings", timeout=min(15.0, timeout))
        deadline = time.time() + timeout
        last: Exception | None = None
        while time.time() < deadline:
            dismiss_dev_overlays(self.d)
            try:
                _find(self.d, "e2e.settings.screen", timeout=2.0)
                return
            except Exception as exc:  # noqa: BLE001
                last = exc
            for hint in ("Modo família", "Family mode", "Modo familia", "Versão do Aplicativo", "App Version"):
                if self.d(textContains=hint).exists:
                    return
            # Retry tap if LogBox ate the first one.
            try:
                self._tap_center("e2e.tab.settings", timeout=3.0)
            except Exception:  # noqa: BLE001
                pass
            time.sleep(0.4)
        raise TimeoutError(f"settings screen not reached: {last}")

    def expect_family_section(self, timeout: float = 30.0) -> None:
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                _find(self.d, "e2e.family.section", timeout=1.5)
                return
            except TimeoutError:
                pass
            for hint in ("Modo família", "Family mode", "Modo familia"):
                if self.d(textContains=hint).exists:
                    return
            # Family block is below the fold on small screens.
            self.d.swipe_ext("up", scale=0.6)
            time.sleep(0.4)
        raise TimeoutError("family settings section not found")
