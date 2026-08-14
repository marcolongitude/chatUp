from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Account:
    email: str
    password: str
    user_id: str
    display_name: str


@dataclass(frozen=True)
class E2EConfig:
    api_url: str
    package: str
    metro_port: int
    # DEV mock coords from src/features/location/model/use-location.ts
    mock_lat: float
    mock_lng: float
    account_a: Account
    account_b: Account


def load_config() -> E2EConfig:
    return E2EConfig(
        api_url=os.environ.get(
            "CHATUP_E2E_API_URL",
            "https://chatup-api.147.15.92.201.sslip.io",
        ).rstrip("/"),
        package=os.environ.get("CHATUP_E2E_PACKAGE", "com.chatup.app"),
        metro_port=int(os.environ.get("CHATUP_E2E_METRO_PORT", "8081")),
        mock_lat=float(os.environ.get("CHATUP_E2E_LAT", "-17.803677")),
        mock_lng=float(os.environ.get("CHATUP_E2E_LNG", "-50.920879")),
        account_a=Account(
            email=os.environ.get("CHATUP_E2E_A_EMAIL", "e2e-device-a@chatup.test"),
            password=os.environ.get("CHATUP_E2E_A_PASSWORD", "E2eTest123!"),
            user_id=os.environ.get(
                "CHATUP_E2E_A_ID",
                "2f3d910f-5f61-4a19-b391-eb469b061a92",
            ),
            display_name=os.environ.get("CHATUP_E2E_A_NAME", "E2E Device A"),
        ),
        account_b=Account(
            email=os.environ.get("CHATUP_E2E_B_EMAIL", "e2e-peer-b@chatup.test"),
            password=os.environ.get("CHATUP_E2E_B_PASSWORD", "E2eTest123!"),
            user_id=os.environ.get(
                "CHATUP_E2E_B_ID",
                "6a372bd7-8767-4f62-b0f6-327bae9ac235",
            ),
            display_name=os.environ.get("CHATUP_E2E_B_NAME", "E2E Peer B"),
        ),
    )
