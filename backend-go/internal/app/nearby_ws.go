package app

import (
	"context"
	"sync"
	"time"

	"chatup/backend-go/internal/store"
	"chatup/backend-go/internal/ws"
)

const maxDiscoveryRadiusKm = 3.0

type nearbyCache struct {
	mu   sync.Mutex
	byID map[string]map[string]NearbyUser // observer -> subject -> row
}

func newNearbyCache() *nearbyCache {
	return &nearbyCache{byID: make(map[string]map[string]NearbyUser)}
}

func (c *nearbyCache) get(observerID string) map[string]NearbyUser {
	c.mu.Lock()
	defer c.mu.Unlock()
	src := c.byID[observerID]
	if src == nil {
		return map[string]NearbyUser{}
	}
	out := make(map[string]NearbyUser, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

func (c *nearbyCache) replace(observerID string, users []NearbyUser) {
	c.mu.Lock()
	defer c.mu.Unlock()
	next := make(map[string]NearbyUser, len(users))
	for _, u := range users {
		next[u.ID] = u
	}
	c.byID[observerID] = next
}

func (c *nearbyCache) observersOf(subjectID string) []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]string, 0)
	for observerID, subjects := range c.byID {
		if _, ok := subjects[subjectID]; ok {
			out = append(out, observerID)
		}
	}
	return out
}

func nearbyQueue(u NearbyUser) string {
	if u.FamilyLink {
		return "family"
	}
	return "discovery"
}

func nearbyUserPayload(u NearbyUser) map[string]any {
	item := map[string]any{
		"id":              u.ID,
		"name":            u.Name,
		"avatar":          u.Avatar,
		"distance":        u.DistanceM,
		"locationVisible": u.LocationVisible,
		"inGrace":         u.InGrace,
		"familyLink":      u.FamilyLink,
	}
	if u.LocationVisible {
		item["location"] = map[string]any{
			"latitude":  u.Latitude,
			"longitude": u.Longitude,
		}
	}
	return item
}

type nearbyDiff struct {
	entered []NearbyUser
	left    []NearbyUser
	updated []NearbyUser
}

func diffNearbyLists(oldMap map[string]NearbyUser, next []NearbyUser) nearbyDiff {
	newMap := make(map[string]NearbyUser, len(next))
	for _, u := range next {
		newMap[u.ID] = u
	}

	var d nearbyDiff
	for id, nu := range newMap {
		ou, ok := oldMap[id]
		if !ok {
			d.entered = append(d.entered, nu)
			continue
		}
		if ou.DistanceM != nu.DistanceM ||
			ou.InGrace != nu.InGrace ||
			ou.FamilyLink != nu.FamilyLink ||
			ou.LocationVisible != nu.LocationVisible ||
			ou.Name != nu.Name ||
			ou.Avatar != nu.Avatar {
			d.updated = append(d.updated, nu)
		}
	}
	for id, ou := range oldMap {
		if _, ok := newMap[id]; !ok {
			d.left = append(d.left, ou)
		}
	}
	return d
}

func (s *Service) emitNearbyDiff(observerID string, d nearbyDiff) {
	for _, u := range d.entered {
		s.hub.SendToUser(observerID, ws.Outbound{
			Type: "nearby.entered",
			Data: map[string]any{"queue": nearbyQueue(u), "user": nearbyUserPayload(u)},
		})
	}
	for _, u := range d.updated {
		s.hub.SendToUser(observerID, ws.Outbound{
			Type: "nearby.updated",
			Data: map[string]any{"queue": nearbyQueue(u), "user": nearbyUserPayload(u)},
		})
	}
	for _, u := range d.left {
		s.hub.SendToUser(observerID, ws.Outbound{
			Type: "nearby.left",
			Data: map[string]any{"queue": nearbyQueue(u), "userId": u.ID},
		})
	}
}

// refreshNearbyObserver recomputa a lista do observer, atualiza cache e emite deltas WS.
func (s *Service) refreshNearbyObserver(ctx context.Context, observerID string, lat, lng float64, radiusKm float64) {
	if radiusKm <= 0 {
		radiusKm = 1
	}
	if radiusKm > maxDiscoveryRadiusKm {
		radiusKm = maxDiscoveryRadiusKm
	}

	old := s.nearbyCache.get(observerID)
	next, err := s.computeNearby(ctx, observerID, lat, lng, radiusKm)
	if err != nil {
		return
	}
	// Sem GPS fresco no servidor, discovery some (família/grace permanece).
	if geo, ok, geoErr := s.store.GetUserGeo(ctx, observerID); geoErr == nil && ok && !s.isObserverLocationFresh(geo) {
		next = nearbyFamilyOnly(next)
	}
	s.nearbyCache.replace(observerID, next)
	s.emitNearbyDiff(observerID, diffNearbyLists(old, next))
}

func (s *Service) isObserverLocationFresh(geo store.UserGeo) bool {
	staleAfter := s.locationStaleAfter()
	if staleAfter <= 0 {
		return true
	}
	if geo.LocationUpdatedAt.IsZero() {
		return false
	}
	return time.Since(geo.LocationUpdatedAt.UTC()) <= staleAfter
}

func nearbyFamilyOnly(users []NearbyUser) []NearbyUser {
	out := make([]NearbyUser, 0, len(users))
	for _, u := range users {
		if u.FamilyLink {
			out = append(out, u)
		}
	}
	return out
}

func (s *Service) publishNearbyAfterLocationChange(ctx context.Context, moverID string, lat, lng float64) {
	mover, err := s.store.GetUserByID(ctx, moverID)
	if err != nil {
		return
	}
	radiusKm := float64(mover.NearbyRadiusKm)
	if radiusKm <= 0 {
		radiusKm = 1
	}
	s.refreshNearbyObserver(ctx, moverID, lat, lng, radiusKm)

	affected := make(map[string]struct{})
	for _, observerID := range s.nearbyCache.observersOf(moverID) {
		if observerID != moverID {
			affected[observerID] = struct{}{}
		}
	}

	// Candidatos geográficos no raio máximo (podem passar a ver o mover).
	staleAfter := s.locationStaleAfter()
	if near, err := s.store.ListUsersNearby(ctx, moverID, lat, lng, maxDiscoveryRadiusKm*1000, staleAfter); err == nil {
		for _, u := range near {
			affected[u.ID] = struct{}{}
		}
	} else if all, listErr := s.store.ListUsersWithLocation(ctx, moverID, staleAfter); listErr == nil {
		for _, u := range all {
			if Haversine(lat, lng, u.Latitude, u.Longitude) <= maxDiscoveryRadiusKm {
				affected[u.ID] = struct{}{}
			}
		}
	}

	for observerID := range affected {
		geo, ok, err := s.store.GetUserGeo(ctx, observerID)
		if err != nil || !ok {
			continue
		}
		r := float64(geo.NearbyRadiusKm)
		if r <= 0 {
			r = 1
		}
		s.refreshNearbyObserver(ctx, observerID, geo.Latitude, geo.Longitude, r)
	}
}

func (s *Service) refreshNearbyForUser(ctx context.Context, userID string) {
	geo, ok, err := s.store.GetUserGeo(ctx, userID)
	if err != nil || !ok {
		return
	}
	r := float64(geo.NearbyRadiusKm)
	if r <= 0 {
		r = 1
	}
	s.refreshNearbyObserver(ctx, userID, geo.Latitude, geo.Longitude, r)
}

func nearbySnapshotPayload(observerID string, perimeterKm float64, users []NearbyUser) map[string]any {
	family := make([]map[string]any, 0)
	discovery := make([]map[string]any, 0)
	for _, u := range users {
		item := nearbyUserPayload(u)
		item["queue"] = nearbyQueue(u)
		if u.FamilyLink {
			family = append(family, item)
		} else {
			discovery = append(discovery, item)
		}
	}
	return map[string]any{
		"version":     time.Now().UnixMilli(),
		"observerId":  observerID,
		"perimeterKm": perimeterKm,
		"family":      family,
		"discovery":   discovery,
	}
}

// SyncNearbyOnConnect envia snapshot completo (nearby.sync) ao conectar/reconectar o WS.
func (s *Service) SyncNearbyOnConnect(ctx context.Context, userID string) {
	// Liveness sem HTTP: marca presença na última posição conhecida.
	s.TouchPresence(ctx, userID)

	geo, ok, err := s.store.GetUserGeo(ctx, userID)
	if err != nil || !ok {
		return
	}
	r := float64(geo.NearbyRadiusKm)
	if r <= 0 {
		r = 1
	}
	// Re-read after TouchPresence so observer freshness uses the new timestamp.
	if fresh, ok2, err2 := s.store.GetUserGeo(ctx, userID); err2 == nil && ok2 {
		geo = fresh
	}
	users, err := s.Nearby(ctx, userID, geo.Latitude, geo.Longitude, r)
	if err != nil {
		return
	}
	// Observador com location_updated_at velho não recebe discovery (evita lista
	// unidirecional: ver os outros sem aparecer para eles).
	if !s.isObserverLocationFresh(geo) {
		users = nearbyFamilyOnly(users)
	}
	s.nearbyCache.replace(userID, users)
	s.hub.SendToUser(userID, ws.Outbound{
		Type: "nearby.sync",
		Data: map[string]any{
			"snapshot": nearbySnapshotPayload(userID, r, users),
		},
	})
}
