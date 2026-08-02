from __future__ import annotations

from typing import Any

import requests

from .config import Account, E2EConfig


class StagingApi:
    def __init__(self, cfg: E2EConfig) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def login(self, account: Account) -> str:
        r = self.session.post(
            f"{self.cfg.api_url}/auth/login",
            json={"email": account.email, "password": account.password},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        token = data.get("accessToken") or data.get("access_token")
        if not token:
            raise RuntimeError(f"login missing token: {data}")
        return token

    def put_location(self, token: str, lat: float, lng: float) -> None:
        r = self.session.put(
            f"{self.cfg.api_url}/location",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": lat, "longitude": lng},
            timeout=30,
        )
        r.raise_for_status()

    def nearby(self, token: str) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.cfg.api_url}/location/nearby",
            headers={"Authorization": f"Bearer {token}"},
            params={"latitude": self.cfg.mock_lat, "longitude": self.cfg.mock_lng},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else data.get("users", [])

    def seed_pair_nearby(self) -> None:
        """Place both accounts at the DEV mock point so nearby lists populate."""
        for account in (self.cfg.account_a, self.cfg.account_b):
            token = self.login(account)
            self.put_location(token, self.cfg.mock_lat, self.cfg.mock_lng)

    def get_keys(self, token: str, user_id: str) -> dict[str, Any]:
        r = self.session.get(
            f"{self.cfg.api_url}/keys/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, dict):
            raise RuntimeError(f"unexpected keys payload: {data}")
        return data

    def wait_for_identity_key(self, user_id: str, timeout: float = 60.0) -> str:
        import time

        deadline = time.time() + timeout
        token = self.login(self.cfg.account_a)
        last: Any = None
        while time.time() < deadline:
            try:
                data = self.get_keys(token, user_id)
                key = data.get("identityKey") or data.get("publicKey")
                if data.get("success") and key:
                    return str(key)
                last = data
            except Exception as exc:  # noqa: BLE001
                last = exc
            time.sleep(1.5)
        raise TimeoutError(f"identity key not registered for {user_id}: {last}")

    def max_seq(self, viewer: Account, peer_id: str) -> int:
        token = self.login(viewer)
        rows = self.recent_messages(token, peer_id)
        seqs = [int(r.get("seqNum") or r.get("seq_num") or 0) for r in rows]
        return max(seqs) if seqs else 0

    def wait_for_new_ciphertext(
        self,
        viewer: Account,
        peer_id: str,
        *,
        min_seq: int,
        timeout: float = 60.0,
    ) -> dict[str, Any]:
        import time

        deadline = time.time() + timeout
        token = self.login(viewer)
        while time.time() < deadline:
            rows = self.recent_messages(token, peer_id)
            for row in rows:
                seq = int(row.get("seqNum") or row.get("seq_num") or 0)
                content = str(row.get("content") or "")
                if seq > min_seq and content.startswith("STB:"):
                    return row
            time.sleep(1.0)
        raise TimeoutError(f"no new STB ciphertext with seq > {min_seq}")

    def recent_messages(self, token: str, peer_id: str) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.cfg.api_url}/chat/messages/{peer_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return data
        for key in ("messages", "items", "data"):
            if isinstance(data.get(key), list):
                return data[key]
        return []
