package httpserver

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"chatup/backend-go/internal/app"
	authmw "chatup/backend-go/internal/httpserver/middleware"
	"chatup/backend-go/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type authReq struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

func (h *Handlers) root(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{
		"service": "chatup-backend-go",
		"status":  "ok",
		"docs":    "/swagger/",
		"health":  "/health",
	})
}

func (h *Handlers) swaggerRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/swagger/", http.StatusPermanentRedirect)
}

func (h *Handlers) swaggerUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	_, _ = w.Write([]byte(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChatUp API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/openapi.yaml?v=" + Date.now(),
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`))
}

func (h *Handlers) openapiSpec(w http.ResponseWriter, r *http.Request) {
	if _, err := os.Stat("openapi.yaml"); err != nil {
		http.Error(w, "openapi.yaml not found in runtime image", http.StatusNotFound)
		return
	}
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	http.ServeFile(w, r, "openapi.yaml")
}

func (h *Handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{"status": "ok", "timestamp": time.Now().UTC().Format(time.RFC3339), "service": "chatup-backend-go"})
}

func (h *Handlers) register(w http.ResponseWriter, r *http.Request) {
	var req authReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	result, err := h.svc.Register(r.Context(), app.RegisterInput{
		Email:       req.Email,
		Password:    req.Password,
		DisplayName: req.DisplayName,
	})
	if err != nil {
		switch {
		case errors.Is(err, app.ErrInvalidBody):
			http.Error(w, "invalid body", http.StatusBadRequest)
		case errors.Is(err, app.ErrEmailExists):
			http.Error(w, "email already exists", http.StatusConflict)
		default:
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 201, map[string]any{
		"accessToken": result.AccessToken,
		"user": map[string]any{
			"id":          result.User.ID,
			"username":    result.User.Email,
			"email":       result.User.Email,
			"displayName": result.User.DisplayName,
		},
	})
}

func (h *Handlers) login(w http.ResponseWriter, r *http.Request) {
	var req authReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	result, err := h.svc.Login(r.Context(), app.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		switch {
		case errors.Is(err, app.ErrInvalidBody):
			http.Error(w, "invalid body", http.StatusBadRequest)
		case errors.Is(err, app.ErrInvalidCreds):
			http.Error(w, "Credenciais inválidas", http.StatusUnauthorized)
		case errors.Is(err, app.ErrDatabaseDown):
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
		default:
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 200, map[string]any{
		"accessToken": result.AccessToken,
		"user": map[string]any{
			"id":          result.User.ID,
			"email":       result.User.Email,
			"displayName": result.User.DisplayName,
		},
	})
}

func (h *Handlers) google(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDToken string `json:"idToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	result, err := h.svc.Google(r.Context(), req.IDToken)
	if err != nil {
		if errors.Is(err, app.ErrInvalidToken) {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{
		"accessToken": result.AccessToken,
		"user": map[string]any{
			"id":          result.User.ID,
			"email":       result.User.Email,
			"displayName": result.User.DisplayName,
		},
	})
}

func (h *Handlers) searchUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.svc.SearchUsers(r.Context(), r.URL.Query().Get("q"))
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	out := make([]map[string]any, 0, len(users))
	for _, user := range users {
		out = append(out, map[string]any{
			"id":          user.ID,
			"email":       user.Email,
			"displayName": user.DisplayName,
			"photoURL":    user.PhotoURL,
			"bio":         user.Bio,
		})
	}
	writeJSON(w, 200, out)
}

func (h *Handlers) getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	user, err := h.svc.GetUser(r.Context(), id)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{
		"id":          user.ID,
		"email":       user.Email,
		"displayName": user.DisplayName,
		"photoURL":    user.PhotoURL,
		"phoneNumber": user.PhoneNumber,
		"bio":         user.Bio,
		"publicKey":   user.PublicKey,
		"createdAt":   user.CreatedAt,
		"updatedAt":   user.UpdatedAt,
	})
}

func (h *Handlers) updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	actorID := r.Context().Value(authmw.UserIDKey).(string)

	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	user, err := h.svc.UpdateUser(r.Context(), actorID, id, app.UpdateUserInput{
		DisplayName: store.PtrStringFromAny(body["displayName"]),
		PhotoURL:    store.PtrStringFromAny(body["photoURL"]),
		Bio:         store.PtrStringFromAny(body["bio"]),
		PhoneNumber: store.PtrStringFromAny(body["phoneNumber"]),
		PublicKey: store.FirstNonEmpty(
			store.PtrStringFromAny(body["publicKey"]),
			store.PtrStringFromAny(body["public_key"]),
		),
	})
	if err != nil {
		switch {
		case errors.Is(err, app.ErrForbidden):
			http.Error(w, "forbidden", http.StatusForbidden)
		case errors.Is(err, app.ErrNotFound):
			http.Error(w, "User not found", http.StatusNotFound)
		default:
			http.Error(w, "query error", http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, 200, map[string]any{
		"id":          user.ID,
		"email":       user.Email,
		"displayName": user.DisplayName,
		"photoURL":    user.PhotoURL,
		"phoneNumber": user.PhoneNumber,
		"bio":         user.Bio,
		"publicKey":   user.PublicKey,
		"createdAt":   user.CreatedAt,
		"updatedAt":   user.UpdatedAt,
	})
}

func (h *Handlers) sendMessage(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		ReceiverID string `json:"receiverId"`
		Content    string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	msg, err := h.svc.SendMessage(r.Context(), userID, body.ReceiverID, body.Content)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 201, map[string]any{
		"id":          msg.ID,
		"senderId":    msg.SenderID,
		"receiverId":  msg.ReceiverID,
		"content":     msg.Content,
		"timestamp":   msg.Timestamp,
		"isDelivered": msg.IsDelivered,
		"isRead":      msg.IsRead,
	})
}

func (h *Handlers) getMessages(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	contactID := chi.URLParam(r, "contactId")
	limit := app.ParseInt(r.URL.Query().Get("limit"), 20)
	offset := app.ParseInt(r.URL.Query().Get("offset"), 0)
	msgs, err := h.svc.ListMessages(r.Context(), userID, contactID, limit, offset)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	out := make([]map[string]any, 0, len(msgs))
	for _, msg := range msgs {
		out = append(out, map[string]any{
			"id":          msg.ID,
			"senderId":    msg.SenderID,
			"receiverId":  msg.ReceiverID,
			"content":     msg.Content,
			"timestamp":   msg.Timestamp,
			"isDelivered": msg.IsDelivered,
			"isRead":      msg.IsRead,
		})
	}
	writeJSON(w, 200, out)
}

func (h *Handlers) uploadKeys(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		IdentityKey  string           `json:"identityKey"`
		Registration int              `json:"registrationId"`
		SignedPreKey map[string]any   `json:"signedPreKey"`
		PublicKey    string           `json:"publicKey"`
		PreKeys      []map[string]any `json:"preKeys"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	preKeys := make([]store.PreKey, 0, len(body.PreKeys))
	for _, pk := range body.PreKeys {
		preKeys = append(preKeys, store.PreKey{
			KeyID:     store.IntFromAny(pk["keyId"]),
			PublicKey: deref(store.PtrStringFromAny(pk["publicKey"])),
		})
	}

	err := h.svc.UploadKeys(r.Context(), userID, store.KeyUploadInput{
		IdentityKey:  body.IdentityKey,
		Registration: body.Registration,
		SignedPreKey: body.SignedPreKey,
		PublicKey:    body.PublicKey,
		PreKeys:      preKeys,
	})
	if err != nil {
		http.Error(w, "tx error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{"success": true})
}

func (h *Handlers) countMyKeys(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	count, err := h.svc.CountMyKeys(r.Context(), userID)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{"count": count})
}

func (h *Handlers) getKeys(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	bundle, ok, err := h.svc.GetKeys(r.Context(), userID)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	if !ok {
		writeJSON(w, 200, map[string]any{"success": false, "message": "Key bundle not found for user"})
		return
	}
	resp := map[string]any{
		"success":        true,
		"identityKey":    bundle.IdentityKey,
		"registrationId": bundle.Registration,
		"signedPreKey":   bundle.SignedPreKey,
		"publicKey":      bundle.PublicKey,
	}
	if bundle.PreKey != nil {
		resp["preKey"] = map[string]any{"keyId": bundle.PreKey.KeyID, "publicKey": bundle.PreKey.PublicKey}
	}
	writeJSON(w, 200, resp)
}

func (h *Handlers) updateLocation(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := h.svc.UpdateLocation(r.Context(), userID, body.Latitude, body.Longitude); err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, 200, map[string]any{"status": "ok"})
}

func (h *Handlers) nearby(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	lat := app.ParseFloat(r.URL.Query().Get("latitude"), 0)
	lng := app.ParseFloat(r.URL.Query().Get("longitude"), 0)
	radius := app.ParseFloat(r.URL.Query().Get("radius"), 2)
	users, err := h.svc.Nearby(r.Context(), userID, lat, lng, radius)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		return
	}
	out := make([]map[string]any, 0, len(users))
	for _, user := range users {
		out = append(out, map[string]any{
			"id":     user.ID,
			"name":   user.Name,
			"avatar": user.Avatar,
			"location": map[string]any{
				"latitude":  user.Latitude,
				"longitude": user.Longitude,
			},
			"distance": user.DistanceM,
		})
	}
	writeJSON(w, 200, out)
}

func (h *Handlers) uploadFile(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid file", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	_ = os.MkdirAll(h.cfg.UploadDir, 0o755)
	ext := filepath.Ext(header.Filename)
	name := fmt.Sprintf("%s%s", uuid.NewString(), ext)
	path := filepath.Join(h.cfg.UploadDir, name)
	dst, err := os.Create(path)
	if err != nil {
		http.Error(w, "save error", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	size, _ := dst.ReadFrom(file)
	writeJSON(w, 200, map[string]any{"url": "/files/" + name, "path": path, "size": size, "contentType": header.Header.Get("Content-Type")})
}

func (h *Handlers) getFile(w http.ResponseWriter, r *http.Request) {
	filename := filepath.Base(chi.URLParam(r, "filename"))
	http.ServeFile(w, r, filepath.Join(h.cfg.UploadDir, filename))
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
