package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"chatup/backend-go/internal/app"
	"chatup/backend-go/internal/config"
	authmw "chatup/backend-go/internal/httpserver/middleware"
	"chatup/backend-go/internal/observability"
	"chatup/backend-go/internal/store"
	"chatup/backend-go/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handlers struct {
	cfg    config.Config
	svc    *app.Service
	hub    *ws.Hub
	logger *slog.Logger
}

func NewRouter(cfg config.Config, db *pgxpool.Pool, hub *ws.Hub, logger *slog.Logger) http.Handler {
	st := store.New(db)
	svc := app.New(cfg, st, hub, logger)
	h := &Handlers{cfg: cfg, svc: svc, hub: hub, logger: logger}
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)
	r.Use(authmw.CORS(cfg.CORSOrigin))
	r.Use(observability.HTTPTracingMiddleware(cfg.ServiceName))
	r.Use(authmw.RequestLogger(logger))
	r.Use(observability.HTTPMetricsMiddleware)

	r.Get("/health", h.health)
	r.Handle("/metrics", observability.MetricsHandler())
	r.Get("/", h.root)
	r.Get("/swagger", h.swaggerRedirect)
	r.Get("/swagger/", h.swaggerUI)
	r.Get("/openapi.yaml", h.openapiSpec)
	r.Post("/auth/login", h.login)
	r.Post("/auth/register", h.register)
	r.Post("/auth/google", h.google)
	r.Post("/auth/refresh", h.refresh)
	r.Post("/auth/logout", h.logout)
	r.Get("/files/{filename}", h.getFile)
	r.Get("/ws", hub.ServeWS(cfg.JWTSecret, h.handleWS))

	r.Group(func(pr chi.Router) {
		pr.Use(authmw.JWT(cfg.JWTSecret))
		pr.Post("/auth/logout", h.logout) // optional Bearer: revoke all sessions for user
		pr.Get("/users/search", h.searchUsers)
		pr.Get("/users/{id}", h.getUser)
		pr.Put("/users/{id}", h.updateUser)
		pr.Put("/location", h.updateLocation)
		pr.Get("/location/nearby", h.nearby)
		pr.Post("/chat/messages", h.sendMessage)
		pr.Get("/chat/messages/{contactId}", h.getMessages)
		pr.Post("/keys", h.uploadKeys)
		pr.Get("/keys/count/me", h.countMyKeys)
		pr.Get("/keys/{userId}", h.getKeys)
		pr.Post("/files/upload", h.uploadFile)
	})
	return r
}

func (h *Handlers) handleWS(userID string, env ws.Envelope) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	h.svc.HandleWSMessage(ctx, userID, env)
}
