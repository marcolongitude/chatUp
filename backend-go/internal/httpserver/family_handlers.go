package httpserver

import (
	"encoding/json"
	"errors"
	"net/http"

	"chatup/backend-go/internal/app"
	authmw "chatup/backend-go/internal/httpserver/middleware"
	"github.com/go-chi/chi/v5"
)

func familyLinkJSON(link app.FamilyLinkView) map[string]any {
	out := map[string]any{
		"id":                  link.ID,
		"peerId":              link.PeerID,
		"peerName":            link.PeerName,
		"peerAvatar":          link.PeerAvatar,
		"status":              link.Status,
		"requestedBy":         link.RequestedBy,
		"myLocationShare":     link.MyLocationShare,
		"peerLocationShare":   link.PeerLocationShare,
		"locationShareActive": link.LocationShareActive,
		"myMapShare":          link.MyMapShare,
		"peerMapShare":        link.PeerMapShare,
		"myMapMonitor":        link.MyMapMonitor,
		"peerMapMonitor":      link.PeerMapMonitor,
		"mapTrackingActive":   link.MapTrackingActive,
		"iAmChef":             link.IAmChef,
		"createdAt":           link.CreatedAt,
		"updatedAt":           link.UpdatedAt,
	}
	if link.AcceptedAt != nil {
		out["acceptedAt"] = link.AcceptedAt
	}
	return out
}

func (h *Handlers) listFamilyLinks(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	links, err := h.svc.ListFamilyLinks(r.Context(), userID)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	out := make([]map[string]any, 0, len(links))
	for _, link := range links {
		out = append(out, familyLinkJSON(link))
	}
	writeJSON(w, 200, out)
}

func (h *Handlers) requestFamilyLink(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		PeerID string `json:"peerId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.PeerID == "" {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	link, err := h.svc.RequestFamilyLink(r.Context(), userID, body.PeerID)
	if err != nil {
		switch {
		case errors.Is(err, app.ErrFamilySelf):
			http.Error(w, "invalid peer", http.StatusBadRequest)
		case errors.Is(err, app.ErrFamilyPeerMissing):
			http.Error(w, "peer not found", http.StatusNotFound)
		case errors.Is(err, app.ErrFamilyPending):
			http.Error(w, "family link pending", http.StatusConflict)
		case errors.Is(err, app.ErrFamilyExists):
			http.Error(w, "family link exists", http.StatusConflict)
		default:
			http.Error(w, "query error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 201, familyLinkJSON(link))
}

func (h *Handlers) acceptFamilyLink(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	linkID := chi.URLParam(r, "id")
	link, err := h.svc.AcceptFamilyLink(r.Context(), userID, linkID)
	if err != nil {
		if errors.Is(err, app.ErrForbidden) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, familyLinkJSON(link))
}

func (h *Handlers) revokeFamilyLink(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	linkID := chi.URLParam(r, "id")
	if err := h.svc.RevokeFamilyLink(r.Context(), userID, linkID); err != nil {
		if errors.Is(err, app.ErrNotFound) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{"status": "ok"})
}

func (h *Handlers) setFamilyLocationShare(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	linkID := chi.URLParam(r, "id")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	link, err := h.svc.SetFamilyLocationShare(r.Context(), userID, linkID, body.Enabled)
	if err != nil {
		switch {
		case errors.Is(err, app.ErrForbidden):
			http.Error(w, "forbidden", http.StatusForbidden)
		case errors.Is(err, app.ErrNotFound):
			http.Error(w, "not found", http.StatusNotFound)
		default:
			http.Error(w, "query error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 200, familyLinkJSON(link))
}

func (h *Handlers) setFamilyMapShare(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	linkID := chi.URLParam(r, "id")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	link, err := h.svc.SetFamilyMapShare(r.Context(), userID, linkID, body.Enabled)
	if err != nil {
		switch {
		case errors.Is(err, app.ErrForbidden):
			http.Error(w, "forbidden", http.StatusForbidden)
		case errors.Is(err, app.ErrNotFound):
			http.Error(w, "not found", http.StatusNotFound)
		default:
			http.Error(w, "query error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 200, familyLinkJSON(link))
}

func (h *Handlers) setFamilyMapMonitor(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	linkID := chi.URLParam(r, "id")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	link, err := h.svc.SetFamilyMapMonitor(r.Context(), userID, linkID, body.Enabled)
	if err != nil {
		switch {
		case errors.Is(err, app.ErrForbidden):
			http.Error(w, "forbidden", http.StatusForbidden)
		case errors.Is(err, app.ErrNotFound):
			http.Error(w, "not found", http.StatusNotFound)
		default:
			http.Error(w, "query error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 200, familyLinkJSON(link))
}

func (h *Handlers) getFamilyMap(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	snap, err := h.svc.GetFamilyMap(r.Context(), userID)
	if err != nil {
		if errors.Is(err, app.ErrForbidden) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
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
	writeJSON(w, 200, map[string]any{
		"chefId":      snap.ChefID,
		"perimeterKm": snap.PerimeterKm,
		"members":     members,
	})
}
