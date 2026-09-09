"""
Heavy API harness for family mode privacy.

These tests hit staging HTTP only (no devices). They are intentionally strict:
any destination leak when family location share is inactive fails the suite.
"""

from __future__ import annotations

import pytest

from harness.family_security import (
    assert_location_visible,
    assert_no_destination_leak,
    find_peer,
)


pytestmark = [pytest.mark.family, pytest.mark.security]


@pytest.fixture
def pair_ids(api, cfg):
    return {
        "a": api.resolve_user_id(cfg.account_a),
        "b": api.resolve_user_id(cfg.account_b),
        "token_a": api.login(cfg.account_a),
        "token_b": api.login(cfg.account_b),
    }


def test_family_invite_accept_revoke_roundtrip(api, cfg, pair_ids):
    token_a, token_b = pair_ids["token_a"], pair_ids["token_b"]
    a_id, b_id = pair_ids["a"], pair_ids["b"]

    api.revoke_all_family_with_peer(token_a, b_id)
    api.revoke_all_family_with_peer(token_b, a_id)

    link = api.request_family_link(token_a, b_id)
    assert link.get("status") == "pending"
    assert str(link.get("peerId")) == b_id
    assert str(link.get("requestedBy")) == a_id

    peer_view = next(x for x in api.list_family_links(token_b) if x["id"] == link["id"])
    assert peer_view.get("status") == "pending"
    assert str(peer_view.get("requestedBy")) == a_id

    accepted = api.accept_family_link(token_b, link["id"])
    assert accepted.get("status") == "accepted"

    for token in (token_a, token_b):
        row = next(x for x in api.list_family_links(token) if x["id"] == link["id"])
        assert row.get("status") == "accepted"
        assert row.get("locationShareActive") is False

    api.revoke_family_link(token_a, link["id"])
    left_a = [x for x in api.list_family_links(token_a) if x["id"] == link["id"]]
    left_b = [x for x in api.list_family_links(token_b) if x["id"] == link["id"]]
    assert left_a == []
    assert left_b == []


def test_family_without_location_share_never_leaks_coords(api, cfg, pair_ids):
    """SECURITY: accepted family + no mutual location share ⇒ no destination."""
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    b_id = pair_ids["b"]

    # Ensure both sides leave location share OFF
    api.set_family_location_share(token_a, link["id"], False)
    api.set_family_location_share(token_b, link["id"], False)

    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)

    rows = api.nearby(token_a, radius=3)
    peer = find_peer(rows, b_id)
    assert peer is not None, f"peer missing from nearby: {rows}"
    assert peer.get("familyLink") is True
    assert peer.get("locationShareActive") in (None, False)
    assert_no_destination_leak(peer, context="family-no-share-inside")


def test_family_location_share_requires_both_sides(api, cfg, pair_ids):
    """SECURITY: unilateral share must not unlock coordinates."""
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    b_id = pair_ids["b"]

    api.set_family_location_share(token_a, link["id"], True)
    api.set_family_location_share(token_b, link["id"], False)
    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)

    a_links = api.list_family_links(token_a)
    row_link = next(x for x in a_links if x["id"] == link["id"])
    assert row_link.get("myLocationShare") is True
    assert row_link.get("peerLocationShare") is False
    assert row_link.get("locationShareActive") is False

    peer = find_peer(api.nearby(token_a, radius=3), b_id)
    assert peer is not None
    assert_no_destination_leak(peer, context="family-unilateral-share")


def test_family_mutual_location_share_exposes_coords(api, cfg, pair_ids):
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    b_id = pair_ids["b"]

    api.set_family_location_share(token_a, link["id"], True)
    api.set_family_location_share(token_b, link["id"], True)
    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)

    row_link = next(x for x in api.list_family_links(token_a) if x["id"] == link["id"])
    assert row_link.get("locationShareActive") is True

    peer = find_peer(api.nearby(token_a, radius=3), b_id)
    assert peer is not None
    assert peer.get("familyLink") is True
    assert_location_visible(peer, context="family-mutual-share")


def test_family_grace_keeps_list_without_destination(api, cfg, pair_ids):
    """
    SECURITY + product: after leaving perimeter without location share,
    peer stays on list (grace) but destination must stay hidden.
    """
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    a_id, b_id = pair_ids["a"], pair_ids["b"]

    api.set_family_location_share(token_a, link["id"], False)
    api.set_family_location_share(token_b, link["id"], False)

    # Establish presence inside
    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)
    inside = find_peer(api.nearby(token_a, radius=3), b_id)
    assert inside is not None
    assert_no_destination_leak(inside, context="pre-leave")

    # Move B far outside A's 3km radius (~111km)
    far_lat = cfg.mock_lat + 1.0
    api.put_location(token_b, far_lat, cfg.mock_lng)

    grace = find_peer(api.nearby(token_a, radius=3), b_id)
    assert grace is not None, "family peer must remain on list during grace"
    assert grace.get("inGrace") is True
    assert grace.get("familyLink") is True
    assert_no_destination_leak(grace, context="family-grace-after-leave")

    # Expire grace via DB clock skew (requires kubectl to staging postgres)
    try:
        api.backdate_nearby_presence(a_id, b_id, minutes=31)
    except RuntimeError as exc:
        pytest.skip(f"db backdate unavailable: {exc}")

    after = find_peer(api.nearby(token_a, radius=3), b_id)
    assert after is None, f"peer must leave list after grace expiry, still got {after!r}"


def test_family_with_location_share_leaves_list_immediately(api, cfg, pair_ids):
    """With mutual location share, leaving perimeter drops from list (no grace)."""
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    b_id = pair_ids["b"]

    api.set_family_location_share(token_a, link["id"], True)
    api.set_family_location_share(token_b, link["id"], True)
    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)
    assert find_peer(api.nearby(token_a, radius=3), b_id) is not None

    api.put_location(token_b, cfg.mock_lat + 1.0, cfg.mock_lng)
    gone = find_peer(api.nearby(token_a, radius=3), b_id)
    assert gone is None, f"mutual-share peer must not stay via grace, got {gone!r}"


def test_revoking_family_removes_grace_path(api, cfg, pair_ids):
    link = api.ensure_accepted_family(cfg.account_a, cfg.account_b)
    token_a, token_b = api.login(cfg.account_a), api.login(cfg.account_b)
    b_id = pair_ids["b"]

    api.set_family_location_share(token_a, link["id"], False)
    api.set_family_location_share(token_b, link["id"], False)
    api.put_location(token_a, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat, cfg.mock_lng)
    api.put_location(token_b, cfg.mock_lat + 1.0, cfg.mock_lng)
    assert find_peer(api.nearby(token_a, radius=3), b_id) is not None

    api.revoke_family_link(token_a, link["id"])
    after = find_peer(api.nearby(token_a, radius=3), b_id)
    assert after is None, "revoked family must not remain via grace"
