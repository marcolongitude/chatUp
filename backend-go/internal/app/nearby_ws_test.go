package app

import (
	"context"
	"testing"
	"time"

	"chatup/backend-go/internal/store"
)

func TestDiffNearbyListsEnterLeaveUpdate(t *testing.T) {
	old := map[string]NearbyUser{
		"a": {ID: "a", Name: "A", DistanceM: 100, FamilyLink: false},
		"b": {ID: "b", Name: "B", DistanceM: 200, FamilyLink: true},
	}
	next := []NearbyUser{
		{ID: "a", Name: "A", DistanceM: 150, FamilyLink: false}, // updated distance
		{ID: "c", Name: "C", DistanceM: 50, FamilyLink: false},  // entered
		// b left
	}
	d := diffNearbyLists(old, next)
	if len(d.entered) != 1 || d.entered[0].ID != "c" {
		t.Fatalf("entered: %+v", d.entered)
	}
	if len(d.left) != 1 || d.left[0].ID != "b" {
		t.Fatalf("left: %+v", d.left)
	}
	if len(d.updated) != 1 || d.updated[0].ID != "a" || d.updated[0].DistanceM != 150 {
		t.Fatalf("updated: %+v", d.updated)
	}
}

func TestUpdateLocationEmitsNearbyDeltas(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "peer", Name: "Peer", Latitude: -23.0, Longitude: -46.0},
		},
		familyPeers: map[string]bool{},
	}
	st.getUserByIDFn = func(ctx context.Context, userID string) (store.User, error) {
		return store.User{ID: userID, NearbyRadiusKm: 1}, nil
	}
	hub := &fakeHub{online: map[string]bool{"mover": true, "peer": true}}
	svc := New(
		newTestService(&fakeStore{}, hub).cfg,
		st,
		hub,
		nil,
	)

	// Seed cache empty → first location publish should enter peer for mover.
	if err := svc.UpdateLocation(context.Background(), "mover", -23.0, -46.0); err != nil {
		t.Fatalf("UpdateLocation: %v", err)
	}

	hasEntered := false
	for i, typ := range hub.sentTypes {
		if typ == "nearby.entered" && hub.sentToUsers[i] == "mover" {
			hasEntered = true
			break
		}
	}
	if !hasEntered {
		t.Fatalf("expected nearby.entered to mover, got types=%v to=%v", hub.sentTypes, hub.sentToUsers)
	}
}

func TestNearbyQueue(t *testing.T) {
	if nearbyQueue(NearbyUser{FamilyLink: true}) != "family" {
		t.Fatal("family queue")
	}
	if nearbyQueue(NearbyUser{FamilyLink: false}) != "discovery" {
		t.Fatal("discovery queue")
	}
}

func TestComputeNearbyExcludesStalePeer(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "fresh", Name: "Fresh", Latitude: -23.0, Longitude: -46.0, LocationUpdatedAt: time.Now()},
			{ID: "stale", Name: "Stale", Latitude: -23.001, Longitude: -46.001, LocationUpdatedAt: time.Now().Add(-2 * time.Hour)},
		},
		familyPeers: map[string]bool{},
	}
	cfg := newTestService(&fakeStore{}, &fakeHub{}).cfg
	cfg.LocationStaleSeconds = 300
	svc := New(cfg, st, &fakeHub{}, nil)

	out, err := svc.Nearby(context.Background(), "me", -23.0, -46.0, 3)
	if err != nil {
		t.Fatalf("Nearby: %v", err)
	}
	if len(out) != 1 || out[0].ID != "fresh" {
		t.Fatalf("expected only fresh peer, got %+v", out)
	}
}

func TestSyncNearbyOnConnectEmitsSnapshot(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "peer", Name: "Peer", Latitude: -23.0, Longitude: -46.0, LocationUpdatedAt: time.Now()},
		},
		userGeo: map[string]store.UserGeo{
			"me": {
				Latitude:          -23.0,
				Longitude:         -46.0,
				NearbyRadiusKm:    1,
				LocationUpdatedAt: time.Now(),
			},
		},
	}
	hub := &fakeHub{online: map[string]bool{"me": true}}
	svc := New(newTestService(&fakeStore{}, hub).cfg, st, hub, nil)

	svc.SyncNearbyOnConnect(context.Background(), "me")

	found := false
	for _, typ := range hub.sentTypes {
		if typ == "nearby.sync" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected nearby.sync, got %v", hub.sentTypes)
	}
}

func TestSyncNearbyOnConnectTouchPresenceRefreshesObserver(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "peer", Name: "Peer", Latitude: -23.0, Longitude: -46.0, LocationUpdatedAt: time.Now()},
		},
		userGeo: map[string]store.UserGeo{
			"me": {
				Latitude:          -23.0,
				Longitude:         -46.0,
				NearbyRadiusKm:    1,
				LocationUpdatedAt: time.Now().Add(-2 * time.Hour),
			},
		},
		familyPeers: map[string]bool{},
	}
	hub := &fakeHub{online: map[string]bool{"me": true}}
	cfg := newTestService(&fakeStore{}, hub).cfg
	cfg.LocationStaleSeconds = 300
	svc := New(cfg, st, hub, nil)

	svc.SyncNearbyOnConnect(context.Background(), "me")

	data, ok := hub.lastData.(map[string]any)
	if !ok {
		t.Fatalf("expected map data, got %#v", hub.lastData)
	}
	snap, ok := data["snapshot"].(map[string]any)
	if !ok {
		t.Fatalf("expected snapshot, got %#v", data)
	}
	discovery, _ := snap["discovery"].([]map[string]any)
	if len(discovery) != 1 {
		t.Fatalf("expected discovery restored via presence touch, got %#v", discovery)
	}
}

func TestSyncNearbyOnConnectSkipsDiscoveryWhenNoGeo(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "peer", Name: "Peer", Latitude: -23.0, Longitude: -46.0, LocationUpdatedAt: time.Now()},
		},
		userGeo:     map[string]store.UserGeo{},
		familyPeers: map[string]bool{},
	}
	hub := &fakeHub{online: map[string]bool{"me": true}}
	svc := New(newTestService(&fakeStore{}, hub).cfg, st, hub, nil)

	svc.SyncNearbyOnConnect(context.Background(), "me")

	if len(hub.sentTypes) != 0 {
		t.Fatalf("expected no nearby.sync without geo, got %v", hub.sentTypes)
	}
}
