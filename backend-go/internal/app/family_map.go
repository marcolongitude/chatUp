package app

import (
	"context"
	"errors"
	"time"

	"chatup/backend-go/internal/store"
	"chatup/backend-go/internal/ws"
	"github.com/jackc/pgx/v5"
)

type FamilyMapMember struct {
	LinkID          string
	PeerID          string
	PeerName        string
	PeerAvatar      string
	MapTrackingActive bool
	LocationVisible bool
	InPerimeter     bool
	InGrace         bool
	Latitude        float64
	Longitude       float64
	LocationUpdatedAt *time.Time
	DistanceM       *int
}

type FamilyMapSnapshot struct {
	ChefID      string
	PerimeterKm float64
	Members     []FamilyMapMember
}

func (s *Service) SetFamilyMapShare(ctx context.Context, actorID, linkID string, enabled bool) (FamilyLinkView, error) {
	link, err := s.store.SetFamilyMapShare(ctx, linkID, actorID, enabled)
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
	if chefID := link.RequestedBy; chefID != "" {
		s.pushFamilyMapSnapshot(ctx, chefID)
	}
	return s.familyLinkViewForActor(ctx, actorID, link.ID)
}

func (s *Service) SetFamilyMapMonitor(ctx context.Context, actorID, linkID string, enabled bool) (FamilyLinkView, error) {
	link, err := s.store.SetFamilyMapMonitor(ctx, linkID, actorID, enabled)
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
	s.pushFamilyMapSnapshot(ctx, actorID)
	return s.familyLinkViewForActor(ctx, actorID, link.ID)
}

func (s *Service) familyLinkViewForActor(ctx context.Context, actorID, linkID string) (FamilyLinkView, error) {
	links, listErr := s.store.ListFamilyLinksForUser(ctx, actorID)
	if listErr == nil {
		for _, item := range links {
			if item.ID == linkID {
				return toFamilyView(item), nil
			}
		}
	}
	return FamilyLinkView{ID: linkID}, nil
}

func (s *Service) GetFamilyMap(ctx context.Context, chefID string) (FamilyMapSnapshot, error) {
	snap, err := s.buildFamilyMapSnapshot(ctx, chefID)
	if err != nil {
		return FamilyMapSnapshot{}, err
	}
	if snap == nil {
		return FamilyMapSnapshot{}, ErrForbidden
	}
	return *snap, nil
}

func (s *Service) buildFamilyMapSnapshot(ctx context.Context, chefID string) (*FamilyMapSnapshot, error) {
	links, err := s.store.ListAcceptedChefLinks(ctx, chefID)
	if err != nil {
		return nil, ErrQueryFailed
	}
	if len(links) == 0 {
		return nil, nil
	}

	chefGeo, ok, geoErr := s.store.GetUserGeo(ctx, chefID)
	if geoErr != nil {
		return nil, ErrQueryFailed
	}
	perimeterKm := 1.0
	if ok && chefGeo.NearbyRadiusKm > 0 {
		perimeterKm = float64(chefGeo.NearbyRadiusKm)
	}

	grace := FamilyGracePeriod
	if s.cfg.FamilyGraceSeconds > 0 {
		grace = time.Duration(s.cfg.FamilyGraceSeconds) * time.Second
	}
	staleAfter := s.locationStaleAfter()

	graceRows, graceErr := s.store.ListFamilyGraceSubjects(ctx, chefID, grace)
	graceBySubject := map[string]store.PresenceGraceRow{}
	if graceErr == nil {
		for _, row := range graceRows {
			graceBySubject[row.SubjectID] = row
		}
	}

	members := make([]FamilyMapMember, 0, len(links))
	insideIDs := make([]string, 0)
	for _, link := range links {
		member := FamilyMapMember{
			LinkID:            link.ID,
			PeerID:            link.PeerID,
			PeerName:          link.PeerName,
			PeerAvatar:        link.PeerAvatar,
			MapTrackingActive: link.MapTrackingActive,
		}
		if !link.MapTrackingActive {
			members = append(members, member)
			continue
		}

		memberGeo, hasGeo, err := s.store.GetUserGeo(ctx, link.PeerID)
		if err != nil {
			return nil, ErrQueryFailed
		}
		if !hasGeo || !ok {
			if _, inGrace := graceBySubject[link.PeerID]; inGrace {
				member.InGrace = true
			}
			members = append(members, member)
			continue
		}

		fresh := staleAfter <= 0 || (!memberGeo.LocationUpdatedAt.IsZero() &&
			time.Since(memberGeo.LocationUpdatedAt.UTC()) <= staleAfter)
		distKm := Haversine(chefGeo.Latitude, chefGeo.Longitude, memberGeo.Latitude, memberGeo.Longitude)
		inPerimeter := fresh && distKm <= perimeterKm
		member.InPerimeter = inPerimeter
		updatedAt := memberGeo.LocationUpdatedAt
		member.LocationUpdatedAt = &updatedAt
		distM := int(distKm * 1000)
		member.DistanceM = &distM

		if inPerimeter {
			member.LocationVisible = true
			member.Latitude = memberGeo.Latitude
			member.Longitude = memberGeo.Longitude
			insideIDs = append(insideIDs, link.PeerID)
		} else if _, inGrace := graceBySubject[link.PeerID]; inGrace {
			member.InGrace = true
		}
		members = append(members, member)
	}

	_ = s.store.TouchNearbyPresence(ctx, chefID, insideIDs)

	return &FamilyMapSnapshot{
		ChefID:      chefID,
		PerimeterKm: perimeterKm,
		Members:     members,
	}, nil
}

func (s *Service) pushFamilyMapSnapshot(ctx context.Context, chefID string) {
	snap, err := s.buildFamilyMapSnapshot(ctx, chefID)
	if err != nil || snap == nil {
		return
	}
	s.hub.SendToUser(chefID, ws.Outbound{
		Type: "family.map.sync",
		Data: familyMapSnapshotPayload(*snap),
	})
}

// SyncFamilyMapOnConnect sends family.map.sync when the user is a family chef.
func (s *Service) SyncFamilyMapOnConnect(ctx context.Context, userID string) {
	s.pushFamilyMapSnapshot(ctx, userID)
}

func familyMapSnapshotPayload(snap FamilyMapSnapshot) map[string]any {
	members := make([]map[string]any, 0, len(snap.Members))
	for _, m := range snap.Members {
		item := map[string]any{
			"linkId":            m.LinkID,
			"peerId":            m.PeerID,
			"peerName":          m.PeerName,
			"peerAvatar":        m.PeerAvatar,
			"mapTrackingActive": m.MapTrackingActive,
			"locationVisible":   m.LocationVisible,
			"inPerimeter":       m.InPerimeter,
			"inGrace":           m.InGrace,
		}
		if m.LocationUpdatedAt != nil {
			item["locationUpdatedAt"] = m.LocationUpdatedAt.UTC()
		}
		if m.DistanceM != nil {
			item["distanceM"] = *m.DistanceM
		}
		if m.LocationVisible {
			item["latitude"] = m.Latitude
			item["longitude"] = m.Longitude
		}
		members = append(members, item)
	}
	return map[string]any{
		"chefId":      snap.ChefID,
		"perimeterKm": snap.PerimeterKm,
		"members":     members,
	}
}

func (s *Service) publishFamilyMapAfterMemberMove(ctx context.Context, memberID string, lat, lng float64) {
	chefs, err := s.store.ListChefsMonitoringMember(ctx, memberID)
	if err != nil || len(chefs) == 0 {
		return
	}
	staleAfter := s.locationStaleAfter()
	memberGeo, ok, geoErr := s.store.GetUserGeo(ctx, memberID)
	if geoErr != nil || !ok {
		return
	}
	fresh := staleAfter <= 0 || (!memberGeo.LocationUpdatedAt.IsZero() &&
		time.Since(memberGeo.LocationUpdatedAt.UTC()) <= staleAfter)

	for _, chefID := range chefs {
		chefGeo, chefOK, err := s.store.GetUserGeo(ctx, chefID)
		if err != nil || !chefOK {
			continue
		}
		perimeterKm := float64(chefGeo.NearbyRadiusKm)
		if perimeterKm <= 0 {
			perimeterKm = 1
		}
		distKm := Haversine(chefGeo.Latitude, chefGeo.Longitude, lat, lng)
		inPerimeter := fresh && distKm <= perimeterKm
		payload := map[string]any{
			"peerId":      memberID,
			"inPerimeter": inPerimeter,
			"updatedAt":   memberGeo.LocationUpdatedAt.UTC(),
			"distanceM":   int(distKm * 1000),
		}
		if inPerimeter {
			payload["latitude"] = lat
			payload["longitude"] = lng
			payload["locationVisible"] = true
			_ = s.store.TouchNearbyPresence(ctx, chefID, []string{memberID})
		} else {
			payload["locationVisible"] = false
		}
		s.hub.SendToUser(chefID, ws.Outbound{
			Type: "family.map.updated",
			Data: payload,
		})
	}
}
