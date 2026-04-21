package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"chatup/backend-go/internal/config"
	authmw "chatup/backend-go/internal/httpserver/middleware"
	"chatup/backend-go/internal/security"
	"chatup/backend-go/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/api/idtoken"
)

type Server struct {
	cfg    config.Config
	db     *pgxpool.Pool
	hub    *ws.Hub
	logger *slog.Logger
}

func NewRouter(cfg config.Config, db *pgxpool.Pool, hub *ws.Hub, logger *slog.Logger) http.Handler {
	s := &Server{cfg: cfg, db: db, hub: hub, logger: logger}
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer, middleware.Logger)

	r.Get("/health", s.health)
	r.Get("/", s.root)
	r.Get("/swagger", s.swaggerRedirect)
	r.Get("/swagger/", s.swaggerUI)
	r.Get("/openapi.yaml", s.openapiSpec)
	r.Post("/auth/login", s.login)
	r.Post("/auth/register", s.register)
	r.Post("/auth/google", s.google)
	r.Get("/files/{filename}", s.getFile)
	r.Get("/ws", hub.ServeWS(cfg.JWTSecret, s.handleWS))

	r.Group(func(pr chi.Router) {
		pr.Use(authmw.JWT(cfg.JWTSecret))
		pr.Get("/users/search", s.searchUsers)
		pr.Get("/users/{id}", s.getUser)
		pr.Put("/users/{id}", s.updateUser)
		pr.Put("/location", s.updateLocation)
		pr.Get("/location/nearby", s.nearby)
		pr.Post("/chat/messages", s.sendMessage)
		pr.Get("/chat/messages/{contactId}", s.getMessages)
		pr.Post("/keys", s.uploadKeys)
		pr.Get("/keys/count/me", s.countMyKeys)
		pr.Get("/keys/{userId}", s.getKeys)
		pr.Post("/files/upload", s.uploadFile)
	})
	return r
}

func (s *Server) root(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{
		"service": "chatup-backend-go",
		"status":  "ok",
		"docs":    "/swagger/",
		"health":  "/health",
	})
}

func (s *Server) swaggerRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/swagger/", http.StatusPermanentRedirect)
}

func (s *Server) swaggerUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
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
      url: "/openapi.yaml",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>`))
}

func (s *Server) openapiSpec(w http.ResponseWriter, r *http.Request) {
	if _, err := os.Stat("openapi.yaml"); err != nil {
		http.Error(w, "openapi.yaml not found in runtime image", http.StatusNotFound)
		return
	}
	http.ServeFile(w, r, "openapi.yaml")
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{"status": "ok", "timestamp": time.Now().UTC().Format(time.RFC3339), "service": "chatup-backend-go"})
}

type authReq struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req authReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		http.Error(w, "invalid body", 400)
		return
	}
	hash, _ := security.HashPassword(req.Password)
	id := uuid.NewString()
	display := req.DisplayName
	if display == "" {
		display = strings.Split(req.Email, "@")[0]
	}
	_, err := s.db.Exec(r.Context(), `INSERT INTO users(id,email,password_hash,display_name,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())`, id, req.Email, hash, display)
	if err != nil {
		http.Error(w, "email already exists", 409)
		return
	}
	writeJSON(w, 201, map[string]any{"user": map[string]any{"id": id, "username": req.Email, "email": req.Email, "displayName": display}})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req authReq
	_ = json.NewDecoder(r.Body).Decode(&req)
	var id, email, hash, display string
	err := s.db.QueryRow(r.Context(), `SELECT id,email,password_hash,COALESCE(display_name,'') FROM users WHERE email=$1`, req.Email).Scan(&id, &email, &hash, &display)
	if err != nil || !security.ComparePassword(hash, req.Password) {
		http.Error(w, "Credenciais inválidas", 401)
		return
	}
	token, _ := security.CreateToken(s.cfg.JWTSecret, id, email, s.cfg.JWTTTLMinutes)
	writeJSON(w, 200, map[string]any{"accessToken": token, "user": map[string]any{"id": id, "email": email, "displayName": display}})
}

func (s *Server) google(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDToken string `json:"idToken"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.IDToken == "" {
		http.Error(w, "missing idToken", 400)
		return
	}
	payload, err := idtoken.Validate(r.Context(), req.IDToken, s.cfg.GoogleClientID)
	if err != nil {
		http.Error(w, "invalid token", 401)
		return
	}
	email, _ := payload.Claims["email"].(string)
	if email == "" {
		http.Error(w, "invalid token", 401)
		return
	}
	var id, display string
	err = s.db.QueryRow(r.Context(), `SELECT id,COALESCE(display_name,'') FROM users WHERE email=$1`, email).Scan(&id, &display)
	if err != nil {
		id = uuid.NewString()
		display = strings.Split(email, "@")[0]
		_, _ = s.db.Exec(r.Context(), `INSERT INTO users(id,email,google_id,display_name,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())`, id, email, payload.Subject, display)
	}
	token, _ := security.CreateToken(s.cfg.JWTSecret, id, email, s.cfg.JWTTTLMinutes)
	writeJSON(w, 200, map[string]any{"accessToken": token, "user": map[string]any{"id": id, "email": email, "displayName": display}})
}

func (s *Server) searchUsers(w http.ResponseWriter, r *http.Request) {
	q := "%" + r.URL.Query().Get("q") + "%"
	rows, err := s.db.Query(r.Context(), `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(bio,'') FROM users WHERE email ILIKE $1 OR display_name ILIKE $1 LIMIT 30`, q)
	if err != nil {
		http.Error(w, "query error", 500)
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, email, display, photo, bio string
		_ = rows.Scan(&id, &email, &display, &photo, &bio)
		out = append(out, map[string]any{"id": id, "email": email, "displayName": display, "photoURL": photo, "bio": bio})
	}
	writeJSON(w, 200, out)
}

func (s *Server) getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var email, display, photo, phone, bio string
	var publicKey *string
	var createdAt, updatedAt time.Time
	err := s.db.QueryRow(r.Context(), `SELECT email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(phone_number,''),COALESCE(bio,''),public_key,created_at,updated_at FROM users WHERE id=$1`, id).
		Scan(&email, &display, &photo, &phone, &bio, &publicKey, &createdAt, &updatedAt)
	if err != nil {
		http.Error(w, "User not found", 404)
		return
	}
	writeJSON(w, 200, map[string]any{"id": id, "email": email, "displayName": display, "photoURL": photo, "phoneNumber": phone, "bio": bio, "publicKey": publicKey, "createdAt": createdAt, "updatedAt": updatedAt})
}

func (s *Server) updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	_, _ = s.db.Exec(r.Context(), `UPDATE users SET display_name=COALESCE($2,display_name), photo_url=COALESCE($3,photo_url), bio=COALESCE($4,bio), phone_number=COALESCE($5,phone_number), public_key=COALESCE($6,public_key), updated_at=NOW() WHERE id=$1`,
		id, asString(body["displayName"]), asString(body["photoURL"]), asString(body["bio"]), asString(body["phoneNumber"]), firstNonEmpty(asString(body["publicKey"]), asString(body["public_key"])))
	s.getUser(w, r)
}

func (s *Server) sendMessage(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		ReceiverID string `json:"receiverId"`
		Content    string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	id := uuid.NewString()
	var ts time.Time
	_ = s.db.QueryRow(r.Context(), `INSERT INTO messages(id,sender_id,receiver_id,content,timestamp,is_delivered,is_read) VALUES($1,$2,$3,$4,NOW(),$5,false) RETURNING timestamp`,
		id, userID, body.ReceiverID, body.Content, s.hub.IsOnline(body.ReceiverID)).Scan(&ts)
	msg := map[string]any{"id": id, "senderId": userID, "receiverId": body.ReceiverID, "content": body.Content, "timestamp": ts, "isDelivered": s.hub.IsOnline(body.ReceiverID), "isRead": false}
	s.hub.SendToUser(body.ReceiverID, ws.Outbound{Type: "newMessage", Data: msg})
	writeJSON(w, 201, msg)
}

func (s *Server) getMessages(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	contactID := chi.URLParam(r, "contactId")
	limit := parseInt(r.URL.Query().Get("limit"), 20)
	offset := parseInt(r.URL.Query().Get("offset"), 0)
	rows, err := s.db.Query(r.Context(), `SELECT id,sender_id,receiver_id,content,timestamp,is_delivered,is_read
		FROM messages
		WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
		ORDER BY timestamp DESC LIMIT $3 OFFSET $4`, userID, contactID, limit, offset)
	if err != nil {
		http.Error(w, "query error", 500)
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, sender, receiver, content string
		var ts time.Time
		var delivered, read bool
		_ = rows.Scan(&id, &sender, &receiver, &content, &ts, &delivered, &read)
		out = append(out, map[string]any{"id": id, "senderId": sender, "receiverId": receiver, "content": content, "timestamp": ts, "isDelivered": delivered, "isRead": read})
	}
	writeJSON(w, 200, out)
}

func (s *Server) uploadKeys(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		IdentityKey   string         `json:"identityKey"`
		Registration  int            `json:"registrationId"`
		SignedPreKey  map[string]any `json:"signedPreKey"`
		PublicKey     string         `json:"publicKey"`
		PreKeys       []map[string]any `json:"preKeys"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		http.Error(w, "tx error", 500)
		return
	}
	defer tx.Rollback(r.Context())
	spk, _ := json.Marshal(body.SignedPreKey)
	_, _ = tx.Exec(r.Context(), `INSERT INTO keys(user_id,identity_key,public_key,registration_id,signed_pre_key,updated_at)
		VALUES($1,$2,$3,$4,$5,NOW())
		ON CONFLICT (user_id) DO UPDATE SET identity_key=EXCLUDED.identity_key, public_key=EXCLUDED.public_key, registration_id=EXCLUDED.registration_id, signed_pre_key=EXCLUDED.signed_pre_key, updated_at=NOW()`,
		userID, body.IdentityKey, body.PublicKey, body.Registration, spk)
	if len(body.PreKeys) > 0 {
		_, _ = tx.Exec(r.Context(), `DELETE FROM pre_keys WHERE user_id=$1`, userID)
		for _, pk := range body.PreKeys {
			_, _ = tx.Exec(r.Context(), `INSERT INTO pre_keys(id,user_id,key_id,public_key,created_at) VALUES($1,$2,$3,$4,NOW())`,
				uuid.NewString(), userID, intFromAny(pk["keyId"]), asString(pk["publicKey"]))
		}
	}
	_ = tx.Commit(r.Context())
	writeJSON(w, 200, map[string]any{"success": true})
}

func (s *Server) countMyKeys(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var c int
	_ = s.db.QueryRow(r.Context(), `SELECT COUNT(*) FROM pre_keys WHERE user_id=$1`, userID).Scan(&c)
	writeJSON(w, 200, map[string]any{"count": c})
}

func (s *Server) getKeys(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")
	tx, err := s.db.BeginTx(r.Context(), pgx.TxOptions{})
	if err != nil {
		http.Error(w, "tx error", 500)
		return
	}
	defer tx.Rollback(r.Context())
	var identityKey, publicKey string
	var reg int
	var signed []byte
	if err := tx.QueryRow(r.Context(), `SELECT identity_key,COALESCE(public_key,''),registration_id,signed_pre_key FROM keys WHERE user_id=$1`, userID).
		Scan(&identityKey, &publicKey, &reg, &signed); err != nil {
		writeJSON(w, 200, map[string]any{"success": false, "message": "Key bundle not found for user"})
		return
	}
	var preKeyRowID, preKeyPublic string
	var preKeyKeyID int
	err = tx.QueryRow(r.Context(), `SELECT id,key_id,public_key FROM pre_keys WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`, userID).
		Scan(&preKeyRowID, &preKeyKeyID, &preKeyPublic)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "query error", 500)
		return
	}
	if preKeyRowID != "" {
		_, _ = tx.Exec(r.Context(), `DELETE FROM pre_keys WHERE id=$1`, preKeyRowID)
	}
	_ = tx.Commit(r.Context())
	var spk map[string]any
	_ = json.Unmarshal(signed, &spk)
	resp := map[string]any{"success": true, "identityKey": identityKey, "registrationId": reg, "signedPreKey": spk, "publicKey": publicKey}
	if preKeyRowID != "" {
		resp["preKey"] = map[string]any{"keyId": preKeyKeyID, "publicKey": preKeyPublic}
	}
	writeJSON(w, 200, resp)
}

func (s *Server) updateLocation(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	var body struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	_, _ = s.db.Exec(r.Context(), `UPDATE users SET latitude=$2, longitude=$3, updated_at=NOW() WHERE id=$1`, userID, body.Latitude, body.Longitude)
	writeJSON(w, 200, map[string]any{"status": "ok"})
}

func (s *Server) nearby(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(authmw.UserIDKey).(string)
	lat, _ := strconv.ParseFloat(r.URL.Query().Get("latitude"), 64)
	lng, _ := strconv.ParseFloat(r.URL.Query().Get("longitude"), 64)
	radius := parseFloat(r.URL.Query().Get("radius"), 2)
	rows, err := s.db.Query(r.Context(), `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),latitude,longitude
		FROM users WHERE id <> $1 AND latitude IS NOT NULL AND longitude IS NOT NULL`, userID)
	if err != nil {
		http.Error(w, "query error", 500)
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0)
	for rows.Next() {
		var id, email, name, avatar string
		var ulat, ulng float64
		_ = rows.Scan(&id, &email, &name, &avatar, &ulat, &ulng)
		distanceKm := haversine(lat, lng, ulat, ulng)
		if distanceKm <= radius {
			if name == "" {
				name = strings.Split(email, "@")[0]
			}
			out = append(out, map[string]any{"id": id, "name": name, "avatar": avatar, "location": map[string]any{"latitude": ulat, "longitude": ulng}, "distance": int(distanceKm * 1000)})
		}
	}
	writeJSON(w, 200, out)
}

func (s *Server) uploadFile(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid file", 400)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "invalid file", 400)
		return
	}
	defer file.Close()
	_ = os.MkdirAll(s.cfg.UploadDir, 0o755)
	ext := filepath.Ext(header.Filename)
	name := fmt.Sprintf("%s%s", uuid.NewString(), ext)
	path := filepath.Join(s.cfg.UploadDir, name)
	dst, err := os.Create(path)
	if err != nil {
		http.Error(w, "save error", 500)
		return
	}
	defer dst.Close()
	size, _ := dst.ReadFrom(file)
	writeJSON(w, 200, map[string]any{"url": "/files/" + name, "path": path, "size": size, "contentType": header.Header.Get("Content-Type")})
}

func (s *Server) getFile(w http.ResponseWriter, r *http.Request) {
	filename := filepath.Base(chi.URLParam(r, "filename"))
	http.ServeFile(w, r, filepath.Join(s.cfg.UploadDir, filename))
}

func (s *Server) handleWS(userID string, env ws.Envelope) {
	if env.Type != "sendMessage" {
		return
	}
	var payload struct {
		ReceiverID  string `json:"receiverId"`
		Content     string `json:"content"`
		ClientMsgID string `json:"clientMsgId"`
	}
	if err := json.Unmarshal(env.Data, &payload); err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	id := uuid.NewString()
	var ts time.Time
	_ = s.db.QueryRow(ctx, `INSERT INTO messages(id,sender_id,receiver_id,content,timestamp,is_delivered,is_read) VALUES($1,$2,$3,$4,NOW(),$5,false) RETURNING timestamp`,
		id, userID, payload.ReceiverID, payload.Content, s.hub.IsOnline(payload.ReceiverID)).Scan(&ts)
	s.hub.SendToUser(userID, ws.Outbound{Type: "ack", Data: map[string]any{"clientMsgId": payload.ClientMsgID, "serverId": id, "timestamp": ts, "status": "ok"}})
	s.hub.SendToUser(payload.ReceiverID, ws.Outbound{Type: "newMessage", Data: map[string]any{"id": id, "senderId": userID, "receiverId": payload.ReceiverID, "content": payload.Content, "timestamp": ts}})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func parseInt(v string, fallback int) int {
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func parseFloat(v string, fallback float64) float64 {
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return n
}

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}

func asString(v any) *string {
	if v == nil {
		return nil
	}
	s := fmt.Sprint(v)
	if s == "" || s == "<nil>" {
		return nil
	}
	return &s
}

func firstNonEmpty(candidates ...*string) *string {
	for _, c := range candidates {
		if c != nil && *c != "" {
			return c
		}
	}
	return nil
}

func intFromAny(v any) int {
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	default:
		n, _ := strconv.Atoi(fmt.Sprint(v))
		return n
	}
}
