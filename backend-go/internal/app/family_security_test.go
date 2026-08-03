package app

import (
	"context"
	"testing"

	"chatup/backend-go/internal/store"
	"github.com/jackc/pgx/v5"
)

func TestNearbyStripsCoordsForFamilyWithoutShareEvenWhenInside(t *testing.T) {
	st := &nearbyFakeStore{
		geo: []store.UserLocation{
			{ID: "kid", Name: "Kid", Latitude: -23.0, Longitude: -46.0, Avatar: "x"},
		},
		familyPeers: map[string]bool{"kid": false},
	}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	out, err := svc.Nearby(context.Background(), "parent", -23.0, -46.0, 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 {
		t.Fatalf("want 1, got %+v", out)
	}
	if out[0].LocationVisible || out[0].Latitude != 0 || out[0].Longitude != 0 {
		t.Fatalf("coords must be stripped: %+v", out[0])
	}
	if !out[0].FamilyLink {
		t.Fatalf("expected familyLink: %+v", out[0])
	}
}

func TestNearbyShareActiveOutsideRadiusAbsentWhenStoreRespectsContract(t *testing.T) {
	// Production SQL in ListFamilyGraceSubjects excludes mutual location-share peers.
	st := &nearbyFakeStore{
		geo:         nil,
		familyPeers: map[string]bool{"kid": true},
		grace:       nil,
	}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	out, err := svc.Nearby(context.Background(), "parent", -23.0, -46.0, 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 0 {
		t.Fatalf("share-active peer outside radius must be absent: %+v", out)
	}
}

type familyLinkFake struct {
	fakeStore
	links map[string]store.FamilyLink
}

func (f *familyLinkFake) GetUserByID(ctx context.Context, userID string) (store.User, error) {
	if userID == "missing" {
		return store.User{}, pgx.ErrNoRows
	}
	return store.User{ID: userID, Email: userID + "@t.test", DisplayName: userID}, nil
}

func (f *familyLinkFake) GetFamilyLinkByPair(ctx context.Context, userAID, userBID string) (store.FamilyLink, error) {
	for _, link := range f.links {
		if link.UserAID == userAID && link.UserBID == userBID {
			return link, nil
		}
	}
	return store.FamilyLink{}, pgx.ErrNoRows
}

func (f *familyLinkFake) CreateFamilyLink(ctx context.Context, actorID, peerID string) (store.FamilyLink, error) {
	a, b := store.OrderedPair(actorID, peerID)
	link := store.FamilyLink{
		ID:          "link-1",
		UserAID:     a,
		UserBID:     b,
		RequestedBy: actorID,
		Status:      store.FamilyStatusPending,
	}
	if f.links == nil {
		f.links = map[string]store.FamilyLink{}
	}
	f.links[link.ID] = link
	return link, nil
}

func (f *familyLinkFake) ListFamilyLinksForUser(ctx context.Context, userID string) ([]store.FamilyLink, error) {
	out := make([]store.FamilyLink, 0)
	for _, link := range f.links {
		if link.UserAID == userID || link.UserBID == userID {
			view := link
			if userID == link.UserAID {
				view.PeerID = link.UserBID
			} else {
				view.PeerID = link.UserAID
			}
			out = append(out, view)
		}
	}
	return out, nil
}

func TestRequestFamilyLinkRejectsSelf(t *testing.T) {
	st := &familyLinkFake{}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	_, err := svc.RequestFamilyLink(context.Background(), "u1", "u1")
	if err != ErrFamilySelf {
		t.Fatalf("want ErrFamilySelf, got %v", err)
	}
}

func TestRequestFamilyLinkCreatesPending(t *testing.T) {
	st := &familyLinkFake{}
	svc := New(newTestService(&fakeStore{}, &fakeHub{online: map[string]bool{}}).cfg, st, &fakeHub{online: map[string]bool{}}, nil)
	view, err := svc.RequestFamilyLink(context.Background(), "parent", "kid")
	if err != nil {
		t.Fatal(err)
	}
	if view.Status != store.FamilyStatusPending || view.PeerID != "kid" {
		t.Fatalf("unexpected view: %+v", view)
	}
}
