package app

import (
	"context"
	"errors"
	"time"

	"chatup/backend-go/internal/store"
	"github.com/jackc/pgx/v5"
)

const FamilyGracePeriod = 30 * time.Minute

var (
	ErrFamilySelf        = errors.New("cannot family-link yourself")
	ErrFamilyPending     = errors.New("family link already pending")
	ErrFamilyExists      = errors.New("family link already accepted")
	ErrFamilyPeerMissing = errors.New("family peer not found")
)

type FamilyLinkView struct {
	ID                  string
	PeerID              string
	PeerName            string
	PeerAvatar          string
	Status              string
	RequestedBy         string
	MyLocationShare     bool
	PeerLocationShare   bool
	LocationShareActive bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
	AcceptedAt          *time.Time
}

func toFamilyView(link store.FamilyLink) FamilyLinkView {
	return FamilyLinkView{
		ID:                  link.ID,
		PeerID:              link.PeerID,
		PeerName:            link.PeerName,
		PeerAvatar:          link.PeerAvatar,
		Status:              link.Status,
		RequestedBy:         link.RequestedBy,
		MyLocationShare:     link.MyLocationShare,
		PeerLocationShare:   link.PeerLocationShare,
		LocationShareActive: link.LocationShareActive,
		CreatedAt:           link.CreatedAt,
		UpdatedAt:           link.UpdatedAt,
		AcceptedAt:          link.AcceptedAt,
	}
}

func (s *Service) ListFamilyLinks(ctx context.Context, userID string) ([]FamilyLinkView, error) {
	links, err := s.store.ListFamilyLinksForUser(ctx, userID)
	if err != nil {
		return nil, ErrQueryFailed
	}
	out := make([]FamilyLinkView, 0, len(links))
	for _, link := range links {
		out = append(out, toFamilyView(link))
	}
	return out, nil
}

func (s *Service) RequestFamilyLink(ctx context.Context, actorID, peerID string) (FamilyLinkView, error) {
	if peerID == "" || actorID == peerID {
		return FamilyLinkView{}, ErrFamilySelf
	}
	if _, err := s.store.GetUserByID(ctx, peerID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return FamilyLinkView{}, ErrFamilyPeerMissing
		}
		return FamilyLinkView{}, ErrQueryFailed
	}

	a, b := store.OrderedPair(actorID, peerID)
	existing, err := s.store.GetFamilyLinkByPair(ctx, a, b)
	if err == nil {
		switch existing.Status {
		case store.FamilyStatusAccepted:
			return FamilyLinkView{}, ErrFamilyExists
		case store.FamilyStatusPending:
			return FamilyLinkView{}, ErrFamilyPending
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return FamilyLinkView{}, ErrQueryFailed
	}

	link, err := s.store.CreateFamilyLink(ctx, actorID, peerID)
	if err != nil {
		if errors.Is(err, store.ErrInvalidFamilyPair) {
			return FamilyLinkView{}, ErrFamilySelf
		}
		return FamilyLinkView{}, ErrQueryFailed
	}

	links, listErr := s.store.ListFamilyLinksForUser(ctx, actorID)
	if listErr == nil {
		for _, item := range links {
			if item.ID == link.ID {
				return toFamilyView(item), nil
			}
		}
	}
	view := FamilyLinkView{
		ID:          link.ID,
		PeerID:      peerID,
		Status:      link.Status,
		RequestedBy: link.RequestedBy,
		CreatedAt:   link.CreatedAt,
		UpdatedAt:   link.UpdatedAt,
	}
	return view, nil
}

func (s *Service) AcceptFamilyLink(ctx context.Context, actorID, linkID string) (FamilyLinkView, error) {
	link, err := s.store.AcceptFamilyLink(ctx, linkID, actorID)
	if err != nil {
		if errors.Is(err, store.ErrFamilyNotAcceptable) {
			return FamilyLinkView{}, ErrForbidden
		}
		return FamilyLinkView{}, ErrQueryFailed
	}
	s.refreshNearbyForUser(ctx, actorID)
	if peerID := familyPeerID(link, actorID); peerID != "" {
		s.refreshNearbyForUser(ctx, peerID)
	}
	links, listErr := s.store.ListFamilyLinksForUser(ctx, actorID)
	if listErr == nil {
		for _, item := range links {
			if item.ID == link.ID {
				return toFamilyView(item), nil
			}
		}
	}
	return FamilyLinkView{ID: link.ID, Status: link.Status, RequestedBy: link.RequestedBy}, nil
}

func (s *Service) RevokeFamilyLink(ctx context.Context, actorID, linkID string) error {
	before, _ := s.store.GetFamilyLinkByID(ctx, linkID)
	if err := s.store.RevokeFamilyLink(ctx, linkID, actorID); err != nil {
		if errors.Is(err, store.ErrFamilyNotFound) {
			return ErrNotFound
		}
		return ErrQueryFailed
	}
	s.refreshNearbyForUser(ctx, actorID)
	if peerID := familyPeerID(before, actorID); peerID != "" {
		s.refreshNearbyForUser(ctx, peerID)
	}
	return nil
}

func (s *Service) SetFamilyLocationShare(ctx context.Context, actorID, linkID string, enabled bool) (FamilyLinkView, error) {
	link, err := s.store.SetFamilyLocationShare(ctx, linkID, actorID, enabled)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrFamilyNotAccepted), errors.Is(err, store.ErrFamilyForbidden):
			return FamilyLinkView{}, ErrForbidden
		case errors.Is(err, pgx.ErrNoRows):
			return FamilyLinkView{}, ErrNotFound
		default:
			return FamilyLinkView{}, ErrQueryFailed
		}
	}
	s.refreshNearbyForUser(ctx, actorID)
	if peerID := familyPeerID(link, actorID); peerID != "" {
		s.refreshNearbyForUser(ctx, peerID)
	}
	links, listErr := s.store.ListFamilyLinksForUser(ctx, actorID)
	if listErr == nil {
		for _, item := range links {
			if item.ID == link.ID {
				return toFamilyView(item), nil
			}
		}
	}
	return FamilyLinkView{ID: link.ID, Status: link.Status}, nil
}

func familyPeerID(link store.FamilyLink, actorID string) string {
	if link.PeerID != "" && link.PeerID != actorID {
		return link.PeerID
	}
	if link.UserAID == actorID {
		return link.UserBID
	}
	if link.UserBID == actorID {
		return link.UserAID
	}
	return ""
}
