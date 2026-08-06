package app

import (
	"context"
	"testing"
	"time"

	"chatup/backend-go/internal/store"
)

type nearbyFakeStore struct {
	fakeStore
	geo           []store.UserLocation
	familyPeers   map[string]bool
	grace         []store.PresenceGraceRow
	touchedIDs    []string
	userGeo       map[string]store.UserGeo
}

func (f *nearbyFakeStore) GetUserGeo(ctx context.Context, userID string) (store.UserGeo, bool, error) {
	if f.userGeo != nil {
		if g, ok := f.userGeo[userID]; ok {
			return g, true, nil
		}
	}
	return store.UserGeo{}, false, nil
}

func (f *nearbyFakeStore) ListUsersWithLocation(ctx context.Context, exceptUserID string, staleAfter time.Duration) ([]store.UserLocation, error) {
	if staleAfter <= 0 {
		return f.geo, nil
	}
	cutoff := time.Now().UTC().Add(-staleAfter)
	out := make([]store.UserLocation, 0, len(f.geo))
	for _, u := range f.geo {
		if !u.LocationUpdatedAt.IsZero() && u.LocationUpdatedAt.Before(cutoff) {
			continue
		}
		out = append(out, u)
	}
	return out, nil
}

func (f *nearbyFakeStore) ListAcceptedFamilyPeers(ctx context.Context, userID string) (map[string]bool, error) {
	return f.familyPeers, nil
}

func (f *nearbyFakeStore) TouchNearbyPresence(ctx context.Context, observerID string, subjectIDs []string) error {
	f.touchedIDs = append([]string{}, subjectIDs...)
	return nil
}

func (f *nearbyFakeStore) ListFamilyGraceSubjects(ctx context.Context, observerID string, grace time.Duration) ([]store.PresenceGraceRow, error) {
	return f.grace, nil
}

func TestNearbyKeepsFamilyInGraceWithoutLocation(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "inside-1", Name: "Inside", Latitude: -23.0, Longitude: -46.0},
		},
		familyPeers: map[string]bool{
			"inside-1": false, // family, location share off
			"grace-1":  false,
		},
		grace: []store.PresenceGraceRow{
			{SubjectID: "grace-1", Name: "GraceKid", Avatar: "a.png", LastInsideAt: time.Now()},
		},
	}
	svc := newTestService(&st.fakeStore, &fakeHub{online: map[string]bool{}})
	// Replace store with nearby-capable fake via embedding — newTestService already wired fakeStore.
	// Re-bind: construct service manually.
	svc = New(svc.cfg, st, &fakeHub{online: map[string]bool{}}, svc.logger)

	out, err := svc.Nearby(context.Background(), "observer", -23.0, -46.0, 3)
	if err != nil {
		t.Fatalf("Nearby error: %v", err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 users (inside+grace), got %d", len(out))
	}

	byID := map[string]NearbyUser{}
	for _, u := range out {
		byID[u.ID] = u
	}
	inside := byID["inside-1"]
	if !inside.FamilyLink || inside.LocationVisible {
		t.Fatalf("inside family without location share should hide coords: %+v", inside)
	}
	grace := byID["grace-1"]
	if !grace.InGrace || grace.LocationVisible || !grace.FamilyLink {
		t.Fatalf("grace family user invalid: %+v", grace)
	}
	if len(st.touchedIDs) != 1 || st.touchedIDs[0] != "inside-1" {
		t.Fatalf("expected presence touch for inside-1, got %v", st.touchedIDs)
	}
}

func TestNearbyShowsLocationWhenFamilyShareActive(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "kid-1", Name: "Kid", Latitude: -23.001, Longitude: -46.001},
		},
		familyPeers: map[string]bool{
			"kid-1": true,
		},
	}
	svc := New(
		newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg,
		st,
		&fakeHub{online: map[string]bool{}},
		nil,
	)
	out, err := svc.Nearby(context.Background(), "parent", -23.0, -46.0, 3)
	if err != nil {
		t.Fatalf("Nearby error: %v", err)
	}
	if len(out) != 1 || !out[0].LocationVisible || out[0].Latitude == 0 {
		t.Fatalf("expected visible location for family share: %+v", out)
	}
}
