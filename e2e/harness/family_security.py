"""
Security helpers for family / nearby privacy assertions.

Rule of thumb: list-control must never become destination-tracking.
Fail hard on any coordinate leak when location share is inactive.
"""

from __future__ import annotations

from typing import Any


COORD_KEYS = (
    "latitude",
    "longitude",
    "lat",
    "lng",
    "lon",
    "coords",
    "coordinate",
    "coordinates",
    "geo",
    "geolocation",
    "position",
)


def _walk(obj: Any):
    if isinstance(obj, dict):
        yield obj
        for value in obj.values():
            yield from _walk(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk(item)


def find_peer(rows: list[dict[str, Any]], peer_id: str) -> dict[str, Any] | None:
    for row in rows:
        if str(row.get("id") or "") == peer_id:
            return row
    return None


def assert_no_destination_leak(row: dict[str, Any], *, context: str) -> None:
    """Peer row must not expose where they are."""
    assert row.get("locationVisible") is False, f"{context}: locationVisible must be false, got {row!r}"
    assert "location" not in row or row.get("location") in (None, {}), (
        f"{context}: location object must be absent/empty, got {row.get('location')!r}"
    )
    for key in COORD_KEYS:
        if key in row and row[key] not in (None, "", 0, 0.0):
            raise AssertionError(f"{context}: leaked coordinate field {key}={row[key]!r} in {row!r}")
    for nested in _walk(row.get("location")):
        for key in COORD_KEYS:
            if key in nested and nested[key] not in (None, "", 0, 0.0):
                raise AssertionError(
                    f"{context}: leaked nested coordinate {key}={nested[key]!r} under location"
                )


def assert_location_visible(row: dict[str, Any], *, context: str) -> None:
    """Mutual family location share (or open discovery) may expose coords."""
    assert row.get("locationVisible") is True, f"{context}: locationVisible must be true, got {row!r}"
    loc = row.get("location")
    assert isinstance(loc, dict), f"{context}: expected location object, got {row!r}"
    lat = loc.get("latitude")
    lng = loc.get("longitude")
    assert isinstance(lat, (int, float)) and isinstance(lng, (int, float)), (
        f"{context}: invalid lat/lng in {loc!r}"
    )
    assert not (lat == 0 and lng == 0), f"{context}: suspicious zero coords {loc!r}"


def assert_map_member_no_coords(row: dict[str, Any], *, context: str) -> None:
    """Family map member must not expose live destination without consent/perimeter."""
    assert row.get("locationVisible") is not True, f"{context}: locationVisible must not be true, got {row!r}"
    assert_no_destination_leak(
        {**row, "locationVisible": False},
        context=context,
    )


def assert_map_member_visible(row: dict[str, Any], *, context: str) -> None:
    assert row.get("locationVisible") is True, f"{context}: locationVisible must be true, got {row!r}"
    lat = row.get("latitude")
    lng = row.get("longitude")
    assert isinstance(lat, (int, float)) and isinstance(lng, (int, float)), (
        f"{context}: invalid flat lat/lng in {row!r}"
    )
    assert not (lat == 0 and lng == 0), f"{context}: suspicious zero coords {row!r}"
