package app

import (
	"context"
	"errors"
	"testing"
	"time"

	"chatup/backend-go/internal/store"
)

type familyMapFakeStore struct {
	fakeStore
	chefLinks   []store.FamilyLink
	chefLinksErr error
	userGeo     map[string]store.UserGeo
	grace       []store.PresenceGraceRow
	monitoring  map[string][]string
}

func (f *familyMapFakeStore) ListAcceptedChefLinks(ctx context.Context, chefID string) ([]store.FamilyLink, error) {
	if f.chefLinksErr != nil {
		return nil, f.chefLinksErr
	}
	return f.chefLinks, nil
}

func (f *familyMapFakeStore) GetUserGeo(ctx context.Context, userID string) (store.UserGeo, bool, error) {
	if f.userGeo == nil {
		return store.UserGeo{}, false, nil
	}
	g, ok := f.userGeo[userID]
	return g, ok, nil
}

func (f *familyMapFakeStore) ListFamilyGraceSubjects(ctx context.Context, observerID string, grace time.Duration) ([]store.PresenceGraceRow, error) {
	return f.grace, nil
}

func (f *familyMapFakeStore) TouchNearbyPresence(ctx context.Context, observerID string, subjectIDs []string) error {
	return nil
}

func (f *familyMapFakeStore) ListChefsMonitoringMember(ctx context.Context, memberID string) ([]string, error) {
	if f.monitoring == nil {
		return nil, nil
	}
	return f.monitoring[memberID], nil
}

func TestGetFamilyMapForbiddenWhenNotChef(t *testing.T) {
	st := &familyMapFakeStore{chefLinks: nil}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	_, err := svc.GetFamilyMap(context.Background(), "member")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestGetFamilyMapFailsClosedOnStoreError(t *testing.T) {
	st := &familyMapFakeStore{chefLinksErr: errors.New("db down")}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	_, err := svc.GetFamilyMap(context.Background(), "chef")
	if !errors.Is(err, ErrQueryFailed) {
		t.Fatalf("expected ErrQueryFailed, got %v", err)
	}
}

func TestGetFamilyMapOmitsCoordsWithoutTrackingConsent(t *testing.T) {
	now := time.Now().UTC()
	st := &familyMapFakeStore{
		chefLinks: []store.FamilyLink{{
			ID:                "l1",
			PeerID:            "kid",
			PeerName:          "Kid",
			RequestedBy:       "chef",
			Status:            store.FamilyStatusAccepted,
			MapTrackingActive: false,
		}},
		userGeo: map[string]store.UserGeo{
			"chef": {Latitude: -23.0, Longitude: -46.0, NearbyRadiusKm: 3, LocationUpdatedAt: now},
			"kid":  {Latitude: -23.001, Longitude: -46.001, NearbyRadiusKm: 3, LocationUpdatedAt: now},
		},
	}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	snap, err := svc.GetFamilyMap(context.Background(), "chef")
	if err != nil {
		t.Fatal(err)
	}
	if len(snap.Members) != 1 {
		t.Fatalf("want 1 member, got %+v", snap.Members)
	}
	m := snap.Members[0]
	if m.LocationVisible || m.Latitude != 0 || m.Longitude != 0 {
		t.Fatalf("coords must not leak without map consent: %+v", m)
	}
}

func TestGetFamilyMapShowsCoordsWhenConsentAndInside(t *testing.T) {
	now := time.Now().UTC()
	st := &familyMapFakeStore{
		chefLinks: []store.FamilyLink{{
			ID:                "l1",
			PeerID:            "kid",
			PeerName:          "Kid",
			RequestedBy:       "chef",
			Status:            store.FamilyStatusAccepted,
			MapTrackingActive: true,
		}},
		userGeo: map[string]store.UserGeo{
			"chef": {Latitude: -23.0, Longitude: -46.0, NearbyRadiusKm: 3, LocationUpdatedAt: now},
			"kid":  {Latitude: -23.001, Longitude: -46.001, NearbyRadiusKm: 3, LocationUpdatedAt: now},
		},
	}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	snap, err := svc.GetFamilyMap(context.Background(), "chef")
	if err != nil {
		t.Fatal(err)
	}
	m := snap.Members[0]
	if !m.LocationVisible || !m.InPerimeter {
		t.Fatalf("expected visible pin inside perimeter: %+v", m)
	}
	if m.Latitude == 0 || m.Longitude == 0 {
		t.Fatalf("expected coords: %+v", m)
	}
}

func TestGetFamilyMapGraceWithoutCoords(t *testing.T) {
	now := time.Now().UTC()
	st := &familyMapFakeStore{
		chefLinks: []store.FamilyLink{{
			ID:                "l1",
			PeerID:            "kid",
			PeerName:          "Kid",
			RequestedBy:       "chef",
			Status:            store.FamilyStatusAccepted,
			MapTrackingActive: true,
		}},
		userGeo: map[string]store.UserGeo{
			"chef": {Latitude: -23.0, Longitude: -46.0, NearbyRadiusKm: 1, LocationUpdatedAt: now},
			// Far outside 1km perimeter
			"kid": {Latitude: -23.1, Longitude: -46.1, NearbyRadiusKm: 1, LocationUpdatedAt: now},
		},
		grace: []store.PresenceGraceRow{{SubjectID: "kid", LastInsideAt: now.Add(-5 * time.Minute)}},
	}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	snap, err := svc.GetFamilyMap(context.Background(), "chef")
	if err != nil {
		t.Fatal(err)
	}
	m := snap.Members[0]
	if !m.InGrace {
		t.Fatalf("expected inGrace: %+v", m)
	}
	if m.LocationVisible || m.Latitude != 0 {
		t.Fatalf("grace must not expose live coords: %+v", m)
	}
}

func TestPublishFamilyMapAfterMemberMoveOnlyToChefs(t *testing.T) {
	now := time.Now().UTC()
	st := &familyMapFakeStore{
		userGeo: map[string]store.UserGeo{
			"chef": {Latitude: -23.0, Longitude: -46.0, NearbyRadiusKm: 3, LocationUpdatedAt: now},
			"kid":  {Latitude: -23.001, Longitude: -46.001, NearbyRadiusKm: 3, LocationUpdatedAt: now},
		},
		monitoring: map[string][]string{"kid": {"chef"}},
	}
	hub := &fakeHub{online: map[string]bool{"chef": true}}
	svc := New(newTestService(&fakeStore{}, hub).cfg, st, hub, nil)
	svc.publishFamilyMapAfterMemberMove(context.Background(), "kid", -23.001, -46.001)
	if len(hub.sentTypes) != 1 || hub.sentTypes[0] != "family.map.updated" {
		t.Fatalf("expected family.map.updated, got %v", hub.sentTypes)
	}
	if hub.sentToUsers[0] != "chef" {
		t.Fatalf("expected send to chef, got %v", hub.sentToUsers)
	}
	data, ok := hub.lastData.(map[string]any)
	if !ok || data["locationVisible"] != true {
		t.Fatalf("expected visible update: %#v", hub.lastData)
	}
}
