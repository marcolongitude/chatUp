from __future__ import annotations

import subprocess
from typing import Any

import requests

from .config import Account, E2EConfig


class StagingApi:
    def __init__(self, cfg: E2EConfig) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def login(self, account: Account) -> str:
        token, _ = self.login_full(account)
        return token

    def login_full(self, account: Account) -> tuple[str, dict[str, Any]]:
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
        user = data.get("user") if isinstance(data.get("user"), dict) else {}
        return token, user

    def resolve_user_id(self, account: Account) -> str:
        _, user = self.login_full(account)
        return str(user.get("id") or account.user_id)

    def put_location(self, token: str, lat: float, lng: float) -> None:
        r = self.session.put(
            f"{self.cfg.api_url}/location",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": lat, "longitude": lng},
            timeout=30,
        )
        r.raise_for_status()

    def nearby(
        self,
        token: str,
        *,
        lat: float | None = None,
        lng: float | None = None,
        radius: float = 3,
    ) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.cfg.api_url}/location/nearby",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "latitude": self.cfg.mock_lat if lat is None else lat,
                "longitude": self.cfg.mock_lng if lng is None else lng,
                "radius": radius,
            },
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else data.get("users", [])

    def list_family_links(self, token: str) -> list[dict[str, Any]]:
        r = self.session.get(
            f"{self.cfg.api_url}/family/links",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else []

    def request_family_link(self, token: str, peer_id: str) -> dict[str, Any]:
        r = self.session.post(
            f"{self.cfg.api_url}/family/links",
            headers={"Authorization": f"Bearer {token}"},
            json={"peerId": peer_id},
            timeout=30,
        )
        if r.status_code in (200, 201):
            return r.json()
        # Idempotent enough for harness: pending/exists → refresh list
        if r.status_code == 409:
            links = self.list_family_links(token)
            for link in links:
                if str(link.get("peerId")) == peer_id:
                    return link
        r.raise_for_status()
        return {}

    def accept_family_link(self, token: str, link_id: str) -> dict[str, Any]:
        r = self.session.post(
            f"{self.cfg.api_url}/family/links/{link_id}/accept",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def revoke_family_link(self, token: str, link_id: str) -> None:
        r = self.session.post(
            f"{self.cfg.api_url}/family/links/{link_id}/revoke",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        r.raise_for_status()

    def set_family_location_share(self, token: str, link_id: str, enabled: bool) -> dict[str, Any]:
        r = self.session.patch(
            f"{self.cfg.api_url}/family/links/{link_id}/location-share",
            headers={"Authorization": f"Bearer {token}"},
            json={"enabled": enabled},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def revoke_all_family_with_peer(self, token: str, peer_id: str) -> None:
        for link in self.list_family_links(token):
            if str(link.get("peerId")) == peer_id:
                self.revoke_family_link(token, str(link["id"]))

    def ensure_accepted_family(self, requester: Account, peer: Account) -> dict[str, Any]:
        """Clean slate → request → accept. Returns accepted link as seen by requester."""
        token_a = self.login(requester)
        token_b = self.login(peer)
        peer_id = self.resolve_user_id(peer)
        requester_id = self.resolve_user_id(requester)

        self.revoke_all_family_with_peer(token_a, peer_id)
        self.revoke_all_family_with_peer(token_b, requester_id)

        link = self.request_family_link(token_a, peer_id)
        link_id = str(link.get("id") or "")
        if not link_id:
            raise RuntimeError(f"family request missing id: {link}")

        # Peer accepts
        peer_links = self.list_family_links(token_b)
        match = next((x for x in peer_links if str(x.get("id")) == link_id), None)
        if not match:
            raise RuntimeError(f"peer does not see pending link {link_id}: {peer_links}")
        if match.get("status") == "pending":
            self.accept_family_link(token_b, link_id)

        accepted = next(
            (x for x in self.list_family_links(token_a) if str(x.get("id")) == link_id),
            None,
        )
        if not accepted or accepted.get("status") != "accepted":
            raise RuntimeError(f"family link not accepted: {accepted}")
        return accepted

    def backdate_nearby_presence(
        self,
        observer_id: str,
        subject_id: str,
        *,
        minutes: int = 31,
    ) -> None:
        """Force grace expiry via staging postgres (kubectl)."""
        sql = (
            "UPDATE nearby_presence "
            f"SET last_inside_at = NOW() - interval '{int(minutes)} minutes' "
            f"WHERE observer_id = '{observer_id}' AND subject_id = '{subject_id}';"
        )
        cmd = [
            "kubectl",
            "-n",
            "chatup",
            "exec",
            "deploy/postgres",
            "--",
            "psql",
            "-U",
            "admin",
            "-d",
            "chatup",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            sql,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            raise RuntimeError(
                f"backdate presence failed: {proc.stderr or proc.stdout or proc.returncode}"
            )

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
