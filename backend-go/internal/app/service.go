package app

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

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
	ErrRefreshInvalid   = errors.New("invalid refresh token")
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
	CreateGoogleUser(ctx context.Context, email, googleID, displayName, photoURL string) (store.User, error)
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
	CreateFamilyLink(ctx context.Context, actorID, peerID string) (store.FamilyLink, error)
	GetFamilyLinkByID(ctx context.Context, id string) (store.FamilyLink, error)
	GetFamilyLinkByPair(ctx context.Context, userAID, userBID string) (store.FamilyLink, error)
	AcceptFamilyLink(ctx context.Context, linkID, actorID string) (store.FamilyLink, error)
	RevokeFamilyLink(ctx context.Context, linkID, actorID string) error
	SetFamilyLocationShare(ctx context.Context, linkID, actorID string, enabled bool) (store.FamilyLink, error)
	ListFamilyLinksForUser(ctx context.Context, userID string) ([]store.FamilyLink, error)
	ListAcceptedFamilyPeers(ctx context.Context, userID string) (map[string]bool, error)
	TouchNearbyPresence(ctx context.Context, observerID string, subjectIDs []string) error
	ListFamilyGraceSubjects(ctx context.Context, observerID string, grace time.Duration) ([]store.PresenceGraceRow, error)
	CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (string, error)
	GetValidRefreshToken(ctx context.Context, tokenHash string) (store.RefreshTokenRow, error)
	RevokeRefreshToken(ctx context.Context, id string, replacedBy *string) error
	RevokeAllRefreshTokensForUser(ctx context.Context, userID string) error
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
	AccessToken  string
	RefreshToken string
	User         store.User
}

func (s *Service) issueAuthTokens(ctx context.Context, user store.User) (AuthResult, error) {
	access, err := security.CreateToken(s.cfg.JWTSecret, user.ID, user.Email, s.cfg.JWTTTLMinutes)
	if err != nil {
		return AuthResult{}, err
	}
	plain, hash, err := security.NewRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	expiresAt := time.Now().UTC().Add(time.Duration(s.cfg.JWTRefreshTTLDays) * 24 * time.Hour)
	if _, err := s.store.CreateRefreshToken(ctx, user.ID, hash, expiresAt); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{
		AccessToken:  access,
		RefreshToken: plain,
		User:         user,
	}, nil
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

	return s.issueAuthTokens(ctx, user)
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

	return s.issueAuthTokens(ctx, store.User{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
	})
}

func claimString(claims map[string]any, key string) string {
	v, _ := claims[key].(string)
	return strings.TrimSpace(v)
}

func (s *Service) googleAudiences() []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, 2)
	for _, aud := range []string{s.cfg.GoogleClientID, s.cfg.GoogleAndroidClientID} {
		aud = strings.TrimSpace(aud)
		if aud == "" {
			continue
		}
		if _, ok := seen[aud]; ok {
			continue
		}
		seen[aud] = struct{}{}
		out = append(out, aud)
	}
	return out
}

func (s *Service) validateGoogleIDToken(ctx context.Context, idTokenRaw string) (*idtoken.Payload, error) {
	audiences := s.googleAudiences()
	if len(audiences) == 0 {
		s.logger.Error("google_login_misconfigured", "reason", "missing GOOGLE_CLIENT_ID")
		return nil, ErrInvalidToken
	}

	var lastErr error
	for _, aud := range audiences {
		payload, err := idtoken.Validate(ctx, idTokenRaw, aud)
		if err == nil {
			return payload, nil
		}
		lastErr = err
	}

	s.logger.Warn(
		"google_id_token_invalid",
		"err", lastErr,
		"audiences_tried", len(audiences),
		"token_aud", peekJWTClaim(idTokenRaw, "aud"),
		"token_azp", peekJWTClaim(idTokenRaw, "azp"),
		"token_iss", peekJWTClaim(idTokenRaw, "iss"),
	)
	return nil, ErrInvalidToken
}

// peekJWTClaim reads an unverified JWT claim for diagnostics only.
func peekJWTClaim(jwtRaw, claim string) string {
	parts := strings.Split(jwtRaw, ".")
	if len(parts) < 2 {
		return ""
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}
	var claims map[string]any
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}
	switch v := claims[claim].(type) {
	case string:
		return v
	case []any:
		parts := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				parts = append(parts, s)
			}
		}
		return strings.Join(parts, ",")
	default:
		return ""
	}
}

func (s *Service) Google(ctx context.Context, idTokenRaw string) (AuthResult, error) {
	if idTokenRaw == "" {
		return AuthResult{}, ErrInvalidToken
	}
	payload, err := s.validateGoogleIDToken(ctx, idTokenRaw)
	if err != nil {
		return AuthResult{}, err
	}
	email := claimString(payload.Claims, "email")
	if email == "" {
		return AuthResult{}, ErrInvalidToken
	}

	picture := claimString(payload.Claims, "picture")
	name := claimString(payload.Claims, "name")
	if name == "" {
		name = claimString(payload.Claims, "given_name")
	}

	user, err := s.store.FindUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			display := name
			if display == "" {
				display = strings.Split(email, "@")[0]
			}
			user, err = s.store.CreateGoogleUser(ctx, email, payload.Subject, display, picture)
			if err != nil {
				return AuthResult{}, err
			}
		} else {
			return AuthResult{}, err
		}
	} else if picture != "" && user.PhotoURL != picture {
		// Keep Google profile photo in sync for returning users.
		in := store.UpdateUserInput{PhotoURL: &picture}
		if user.DisplayName == "" && name != "" {
			in.DisplayName = &name
		}
		if updateErr := s.store.UpdateUser(ctx, user.ID, in); updateErr == nil {
			user.PhotoURL = picture
			if in.DisplayName != nil {
				user.DisplayName = *in.DisplayName
			}
		}
	}

	return s.issueAuthTokens(ctx, user)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (AuthResult, error) {
	if refreshToken == "" {
		return AuthResult{}, ErrRefreshInvalid
	}
	hash := security.HashRefreshToken(refreshToken)
	row, err := s.store.GetValidRefreshToken(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AuthResult{}, ErrRefreshInvalid
		}
		return AuthResult{}, ErrDatabaseDown
	}

	user, err := s.store.GetUserByID(ctx, row.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AuthResult{}, ErrRefreshInvalid
		}
		return AuthResult{}, ErrDatabaseDown
	}

	access, err := security.CreateToken(s.cfg.JWTSecret, user.ID, user.Email, s.cfg.JWTTTLMinutes)
	if err != nil {
		return AuthResult{}, err
	}
	plain, hash, err := security.NewRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	expiresAt := time.Now().UTC().Add(time.Duration(s.cfg.JWTRefreshTTLDays) * 24 * time.Hour)
	newID, err := s.store.CreateRefreshToken(ctx, user.ID, hash, expiresAt)
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.store.RevokeRefreshToken(ctx, row.ID, &newID); err != nil {
		s.logger.Warn("failed to revoke old refresh token", "err", err, "id", row.ID)
	}
	return AuthResult{
		AccessToken:  access,
		RefreshToken: plain,
		User:         user,
	}, nil
}

func (s *Service) Logout(ctx context.Context, userID, refreshToken string) error {
	if refreshToken != "" {
		hash := security.HashRefreshToken(refreshToken)
		row, err := s.store.GetValidRefreshToken(ctx, hash)
		if err == nil {
			return s.store.RevokeRefreshToken(ctx, row.ID, nil)
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return ErrDatabaseDown
		}
	}
	if userID != "" {
		return s.store.RevokeAllRefreshTokensForUser(ctx, userID)
	}
	return nil
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
	ID              string
	Name            string
	Avatar          string
	Latitude        float64
	Longitude       float64
	DistanceM       int
	LocationVisible bool
	InGrace         bool
	FamilyLink      bool
}

func (s *Service) Nearby(ctx context.Context, userID string, latitude, longitude, radiusKm float64) ([]NearbyUser, error) {
	radiusMeters := radiusKm * 1000
	familyPeers, err := s.store.ListAcceptedFamilyPeers(ctx, userID)
	if err != nil {
		// Family tables may be missing before migration 0007 — keep geometric nearby.
		familyPeers = map[string]bool{}
	}

	geo := make([]NearbyUser, 0)
	if nearby, err := s.store.ListUsersNearby(ctx, userID, latitude, longitude, radiusMeters); err == nil {
		for _, u := range nearby {
			geo = append(geo, NearbyUser{
				ID:        u.ID,
				Name:      u.Name,
				Avatar:    u.Avatar,
				Latitude:  u.Latitude,
				Longitude: u.Longitude,
				DistanceM: u.DistanceM,
			})
		}
	} else {
		// Fallback until PostGIS migration (0004) is applied.
		users, listErr := s.store.ListUsersWithLocation(ctx, userID)
		if listErr != nil {
			return nil, ErrQueryFailed
		}
		for _, u := range users {
			distanceKm := Haversine(latitude, longitude, u.Latitude, u.Longitude)
			if distanceKm <= radiusKm {
				geo = append(geo, NearbyUser{
					ID:        u.ID,
					Name:      u.Name,
					Avatar:    u.Avatar,
					Latitude:  u.Latitude,
					Longitude: u.Longitude,
					DistanceM: int(distanceKm * 1000),
				})
			}
		}
	}

	insideIDs := make([]string, 0, len(geo))
	out := make([]NearbyUser, 0, len(geo))
	seen := make(map[string]struct{}, len(geo))
	for _, u := range geo {
		insideIDs = append(insideIDs, u.ID)
		locationShareActive, isFamily := familyPeers[u.ID]
		item := u
		item.FamilyLink = isFamily
		// Location coords only when not a family peer, or family with mutual location share.
		item.LocationVisible = !isFamily || locationShareActive
		if !item.LocationVisible {
			item.Latitude = 0
			item.Longitude = 0
		}
		out = append(out, item)
		seen[u.ID] = struct{}{}
	}

	_ = s.store.TouchNearbyPresence(ctx, userID, insideIDs)

	grace := FamilyGracePeriod
	if s.cfg.FamilyGraceSeconds > 0 {
		grace = time.Duration(s.cfg.FamilyGraceSeconds) * time.Second
	}
	graceRows, graceErr := s.store.ListFamilyGraceSubjects(ctx, userID, grace)
	if graceErr == nil {
		for _, row := range graceRows {
			if _, ok := seen[row.SubjectID]; ok {
				continue
			}
			out = append(out, NearbyUser{
				ID:              row.SubjectID,
				Name:            row.Name,
				Avatar:          row.Avatar,
				LocationVisible: false,
				InGrace:         true,
				FamilyLink:      true,
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
