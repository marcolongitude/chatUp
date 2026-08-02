package app

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"chatup/backend-go/internal/config"
	"chatup/backend-go/internal/security"
	"chatup/backend-go/internal/store"
	"chatup/backend-go/internal/ws"
	"github.com/jackc/pgx/v5"
	"google.golang.org/api/idtoken"
)

var (
	ErrInvalidBody      = errors.New("invalid body")
	ErrInvalidToken     = errors.New("invalid token")
	ErrInvalidCreds     = errors.New("invalid credentials")
	ErrEmailExists      = errors.New("email already exists")
	ErrForbidden        = errors.New("forbidden")
	ErrNotFound         = errors.New("not found")
	ErrQueryFailed      = errors.New("query failed")
	ErrTxFailed         = errors.New("tx failed")
	ErrDatabaseDown     = errors.New("database unavailable")
	ErrInvalidMessageWS = errors.New("invalid ws payload")
)

type Service struct {
	cfg    config.Config
	store  storePort
	hub    hubPort
	logger *slog.Logger
}

type storePort interface {
	CreateUser(ctx context.Context, email, passwordHash, displayName string) (store.User, error)
	GetAuthUserByEmail(ctx context.Context, email string) (store.AuthUser, error)
	FindUserByEmail(ctx context.Context, email string) (store.User, error)
	CreateGoogleUser(ctx context.Context, email, googleID, displayName string) (store.User, error)
	SearchUsers(ctx context.Context, term string) ([]store.SearchUser, error)
	GetUserByID(ctx context.Context, userID string) (store.User, error)
	UpdateUser(ctx context.Context, userID string, in store.UpdateUserInput) error
	InsertMessage(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (store.Message, error)
	FindMessageByClientMsgID(ctx context.Context, senderID, clientMsgID string) (store.Message, error)
	ListMessages(ctx context.Context, userID, contactID string, limit, offset int) ([]store.Message, error)
	UploadKeys(ctx context.Context, userID string, in store.KeyUploadInput) error
	CountPreKeys(ctx context.Context, userID string) (int, error)
	GetAndConsumeKeyBundle(ctx context.Context, userID string) (store.KeyBundle, bool, error)
	UpdateLocation(ctx context.Context, userID string, latitude, longitude float64) error
	ListUsersWithLocation(ctx context.Context, exceptUserID string) ([]store.UserLocation, error)
	ListUsersNearby(ctx context.Context, exceptUserID string, latitude, longitude, radiusMeters float64) ([]store.UserLocationDistance, error)
}

type hubPort interface {
	SendToUser(userID string, msg ws.Outbound)
	IsOnline(userID string) bool
}

func New(cfg config.Config, s storePort, hub hubPort, logger *slog.Logger) *Service {
	return &Service{
		cfg:    cfg,
		store:  s,
		hub:    hub,
		logger: logger,
	}
}

type AuthResult struct {
	AccessToken string
	User        store.User
}

type RegisterInput struct {
	Email       string
	Password    string
	DisplayName string
}

func (s *Service) Register(ctx context.Context, in RegisterInput) (AuthResult, error) {
	if in.Email == "" || in.Password == "" {
		return AuthResult{}, ErrInvalidBody
	}

	hash, err := security.HashPassword(in.Password)
	if err != nil {
		return AuthResult{}, err
	}

	display := in.DisplayName
	if display == "" {
		display = strings.Split(in.Email, "@")[0]
	}

	user, err := s.store.CreateUser(ctx, in.Email, hash, display)
	if err != nil {
		return AuthResult{}, ErrEmailExists
	}

	token, err := security.CreateToken(s.cfg.JWTSecret, user.ID, user.Email, s.cfg.JWTTTLMinutes)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{AccessToken: token, User: user}, nil
}

func (s *Service) Login(ctx context.Context, in RegisterInput) (AuthResult, error) {
	if in.Email == "" || in.Password == "" {
		return AuthResult{}, ErrInvalidBody
	}

	user, err := s.store.GetAuthUserByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AuthResult{}, ErrInvalidCreds
		}
		s.logger.Error("login db error", "err", err, "email", in.Email)
		return AuthResult{}, ErrDatabaseDown
	}

	if !security.ComparePassword(user.PasswordHash, in.Password) {
		return AuthResult{}, ErrInvalidCreds
	}

	token, err := security.CreateToken(s.cfg.JWTSecret, user.ID, user.Email, s.cfg.JWTTTLMinutes)
	if err != nil {
		return AuthResult{}, err
	}

	return AuthResult{
		AccessToken: token,
		User: store.User{
			ID:          user.ID,
			Email:       user.Email,
			DisplayName: user.DisplayName,
		},
	}, nil
}

func (s *Service) Google(ctx context.Context, idTokenRaw string) (AuthResult, error) {
	if idTokenRaw == "" {
		return AuthResult{}, ErrInvalidToken
	}
	payload, err := idtoken.Validate(ctx, idTokenRaw, s.cfg.GoogleClientID)
	if err != nil {
		return AuthResult{}, ErrInvalidToken
	}
	email, _ := payload.Claims["email"].(string)
	if email == "" {
		return AuthResult{}, ErrInvalidToken
	}

	user, err := s.store.FindUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			display := strings.Split(email, "@")[0]
			user, err = s.store.CreateGoogleUser(ctx, email, payload.Subject, display)
			if err != nil {
				return AuthResult{}, err
			}
		} else {
			return AuthResult{}, err
		}
	}

	token, err := security.CreateToken(s.cfg.JWTSecret, user.ID, user.Email, s.cfg.JWTTTLMinutes)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{AccessToken: token, User: user}, nil
}

func (s *Service) SearchUsers(ctx context.Context, q string) ([]store.SearchUser, error) {
	users, err := s.store.SearchUsers(ctx, q)
	if err != nil {
		return nil, ErrQueryFailed
	}
	return users, nil
}

func (s *Service) GetUser(ctx context.Context, userID string) (store.User, error) {
	user, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.User{}, ErrNotFound
		}
		return store.User{}, ErrQueryFailed
	}
	return user, nil
}

type UpdateUserInput struct {
	DisplayName    *string
	PhotoURL       *string
	Bio            *string
	PhoneNumber    *string
	PublicKey      *string
	NearbyRadiusKm *int
}

func (s *Service) UpdateUser(ctx context.Context, actorID, targetID string, in UpdateUserInput) (store.User, error) {
	if actorID != targetID {
		return store.User{}, ErrForbidden
	}
	if in.NearbyRadiusKm != nil {
		km := *in.NearbyRadiusKm
		if km != 1 && km != 2 && km != 3 {
			return store.User{}, ErrInvalidBody
		}
	}

	err := s.store.UpdateUser(ctx, targetID, store.UpdateUserInput{
		DisplayName:    in.DisplayName,
		PhotoURL:       in.PhotoURL,
		Bio:            in.Bio,
		PhoneNumber:    in.PhoneNumber,
		PublicKey:      in.PublicKey,
		NearbyRadiusKm: in.NearbyRadiusKm,
	})
	if err != nil {
		return store.User{}, ErrQueryFailed
	}
	return s.GetUser(ctx, targetID)
}

func (s *Service) SendMessage(ctx context.Context, senderID, receiverID, content, clientMsgID string) (store.Message, error) {
	if clientMsgID != "" {
		existing, err := s.store.FindMessageByClientMsgID(ctx, senderID, clientMsgID)
		if err == nil {
			return existing, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return store.Message{}, ErrQueryFailed
		}
	}

	delivered := s.hub.IsOnline(receiverID)
	msg, err := s.store.InsertMessage(ctx, senderID, receiverID, content, delivered, clientMsgID)
	if err != nil {
		// Concurrent retry with same clientMsgId: return the winner row.
		if clientMsgID != "" {
			if existing, findErr := s.store.FindMessageByClientMsgID(ctx, senderID, clientMsgID); findErr == nil {
				return existing, nil
			}
		}
		return store.Message{}, ErrQueryFailed
	}

	payload := map[string]any{
		"id":          msg.ID,
		"senderId":    msg.SenderID,
		"receiverId":  msg.ReceiverID,
		"content":     msg.Content,
		"clientMsgId": msg.ClientMsgID,
		"seqNum":      msg.SeqNum,
		"timestamp":   msg.Timestamp,
		"isDelivered": msg.IsDelivered,
		"isRead":      msg.IsRead,
	}
	s.hub.SendToUser(receiverID, ws.Outbound{Type: "newMessage", Data: payload})

	if clientMsgID != "" {
		s.hub.SendToUser(senderID, ws.Outbound{Type: "ack", Data: map[string]any{
			"clientMsgId": clientMsgID,
			"serverId":    msg.ID,
			"seqNum":      msg.SeqNum,
			"timestamp":   msg.Timestamp,
			"status":      "ok",
		}})
	}
	if delivered {
		s.hub.SendToUser(senderID, ws.Outbound{Type: "delivered", Data: map[string]any{
			"messageId":   msg.ID,
			"clientMsgId": msg.ClientMsgID,
			"seqNum":      msg.SeqNum,
		}})
	}
	return msg, nil
}

func (s *Service) ListMessages(ctx context.Context, userID, contactID string, limit, offset int) ([]store.Message, error) {
	msgs, err := s.store.ListMessages(ctx, userID, contactID, limit, offset)
	if err != nil {
		return nil, ErrQueryFailed
	}
	return msgs, nil
}

func (s *Service) UploadKeys(ctx context.Context, userID string, in store.KeyUploadInput) error {
	if err := s.store.UploadKeys(ctx, userID, in); err != nil {
		return ErrTxFailed
	}
	return nil
}

func (s *Service) CountMyKeys(ctx context.Context, userID string) (int, error) {
	c, err := s.store.CountPreKeys(ctx, userID)
	if err != nil {
		return 0, ErrQueryFailed
	}
	return c, nil
}

func (s *Service) GetKeys(ctx context.Context, userID string) (store.KeyBundle, bool, error) {
	bundle, ok, err := s.store.GetAndConsumeKeyBundle(ctx, userID)
	if err != nil {
		return store.KeyBundle{}, false, ErrTxFailed
	}
	return bundle, ok, nil
}

func (s *Service) UpdateLocation(ctx context.Context, userID string, latitude, longitude float64) error {
	if err := s.store.UpdateLocation(ctx, userID, latitude, longitude); err != nil {
		return ErrQueryFailed
	}
	return nil
}

type NearbyUser struct {
	ID        string
	Name      string
	Avatar    string
	Latitude  float64
	Longitude float64
	DistanceM int
}

func (s *Service) Nearby(ctx context.Context, userID string, latitude, longitude, radiusKm float64) ([]NearbyUser, error) {
	radiusMeters := radiusKm * 1000
	if nearby, err := s.store.ListUsersNearby(ctx, userID, latitude, longitude, radiusMeters); err == nil {
		out := make([]NearbyUser, 0, len(nearby))
		for _, u := range nearby {
			out = append(out, NearbyUser{
				ID:        u.ID,
				Name:      u.Name,
				Avatar:    u.Avatar,
				Latitude:  u.Latitude,
				Longitude: u.Longitude,
				DistanceM: u.DistanceM,
			})
		}
		return out, nil
	}

	// Fallback until PostGIS migration (0004) is applied.
	users, err := s.store.ListUsersWithLocation(ctx, userID)
	if err != nil {
		return nil, ErrQueryFailed
	}
	out := make([]NearbyUser, 0)
	for _, u := range users {
		distanceKm := Haversine(latitude, longitude, u.Latitude, u.Longitude)
		if distanceKm <= radiusKm {
			out = append(out, NearbyUser{
				ID:        u.ID,
				Name:      u.Name,
				Avatar:    u.Avatar,
				Latitude:  u.Latitude,
				Longitude: u.Longitude,
				DistanceM: int(distanceKm * 1000),
			})
		}
	}
	return out, nil
}

func (s *Service) HandleWSMessage(ctx context.Context, userID string, env ws.Envelope) {
	if env.Type != "sendMessage" {
		return
	}
	var payload struct {
		ReceiverID  string `json:"receiverId"`
		Content     string `json:"content"`
		ClientMsgID string `json:"clientMsgId"`
	}
	if err := ParseEnvelope(env.Data, &payload); err != nil {
		return
	}

	// SendMessage already emits newMessage / ack / delivered.
	_, _ = s.SendMessage(ctx, userID, payload.ReceiverID, payload.Content, payload.ClientMsgID)
}
