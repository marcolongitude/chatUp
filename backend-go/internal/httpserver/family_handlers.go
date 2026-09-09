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
