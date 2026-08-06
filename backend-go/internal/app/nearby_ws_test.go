package app

import (
	"context"
	"testing"

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
