package app

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"chatup/backend-go/internal/config"
	"chatup/backend-go/internal/security"
	"chatup/backend-go/internal/store"
	"chatup/backend-go/internal/ws"
	"github.com/jackc/pgx/v5"
)

// compile-time check that fakeStore satisfies storePort
var _ storePort = (*fakeStore)(nil)

type fakeStore struct {
	getAuthUserByEmailFn  func(ctx context.Context, email string) (store.AuthUser, error)
	updateUserFn          func(ctx context.Context, userID string, in store.UpdateUserInput) error
	getUserByIDFn         func(ctx context.Context, userID string) (store.User, error)
	insertMessageFn       func(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (store.Message, error)
	findByClientMsgIDFn   func(ctx context.Context, senderID, clientMsgID string) (store.Message, error)
	uploadKeysFn          func(ctx context.Context, userID string, in store.KeyUploadInput) error
}

func (f *fakeStore) CreateUser(ctx context.Context, email, passwordHash, displayName string) (store.User, error) {
	return store.User{}, nil
}
func (f *fakeStore) GetAuthUserByEmail(ctx context.Context, email string) (store.AuthUser, error) {
	if f.getAuthUserByEmailFn != nil {
		return f.getAuthUserByEmailFn(ctx, email)
	}
	return store.AuthUser{}, nil
}
func (f *fakeStore) FindUserByEmail(ctx context.Context, email string) (store.User, error) {
	return store.User{}, nil
}
func (f *fakeStore) CreateGoogleUser(ctx context.Context, email, googleID, displayName, photoURL string) (store.User, error) {
	return store.User{}, nil
}
func (f *fakeStore) SearchUsers(ctx context.Context, term string) ([]store.SearchUser, error) {
	return nil, nil
}
func (f *fakeStore) GetUserByID(ctx context.Context, userID string) (store.User, error) {
	if f.getUserByIDFn != nil {
		return f.getUserByIDFn(ctx, userID)
	}
	return store.User{}, nil
}
func (f *fakeStore) UpdateUser(ctx context.Context, userID string, in store.UpdateUserInput) error {
	if f.updateUserFn != nil {
		return f.updateUserFn(ctx, userID, in)
	}
	return nil
}
func (f *fakeStore) InsertMessage(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (store.Message, error) {
	if f.insertMessageFn != nil {
		return f.insertMessageFn(ctx, senderID, receiverID, content, isDelivered, clientMsgID)
	}
	return store.Message{}, nil
}
func (f *fakeStore) FindMessageByClientMsgID(ctx context.Context, senderID, clientMsgID string) (store.Message, error) {
	if f.findByClientMsgIDFn != nil {
		return f.findByClientMsgIDFn(ctx, senderID, clientMsgID)
	}
	return store.Message{}, pgx.ErrNoRows
}
func (f *fakeStore) ListMessages(ctx context.Context, userID, contactID string, limit, offset int) ([]store.Message, error) {
	return nil, nil
}
func (f *fakeStore) UploadKeys(ctx context.Context, userID string, in store.KeyUploadInput) error {
	if f.uploadKeysFn != nil {
		return f.uploadKeysFn(ctx, userID, in)
	}
	return nil
}
func (f *fakeStore) CountPreKeys(ctx context.Context, userID string) (int, error) {
	return 0, nil
}
func (f *fakeStore) GetAndConsumeKeyBundle(ctx context.Context, userID string) (store.KeyBundle, bool, error) {
	return store.KeyBundle{}, false, nil
}
func (f *fakeStore) UpdateLocation(ctx context.Context, userID string, latitude, longitude float64) error {
	return nil
}
func (f *fakeStore) ListUsersWithLocation(ctx context.Context, exceptUserID string) ([]store.UserLocation, error) {
	return nil, nil
}
func (f *fakeStore) ListUsersNearby(ctx context.Context, exceptUserID string, latitude, longitude, radiusMeters float64) ([]store.UserLocationDistance, error) {
	return nil, errors.New("postgis unavailable in fake store")
}
func (f *fakeStore) CreateFamilyLink(ctx context.Context, actorID, peerID string) (store.FamilyLink, error) {
	return store.FamilyLink{}, nil
}
func (f *fakeStore) GetFamilyLinkByID(ctx context.Context, id string) (store.FamilyLink, error) {
	return store.FamilyLink{}, pgx.ErrNoRows
}
func (f *fakeStore) GetFamilyLinkByPair(ctx context.Context, userAID, userBID string) (store.FamilyLink, error) {
	return store.FamilyLink{}, pgx.ErrNoRows
}
func (f *fakeStore) AcceptFamilyLink(ctx context.Context, linkID, actorID string) (store.FamilyLink, error) {
	return store.FamilyLink{}, store.ErrFamilyNotAcceptable
}
func (f *fakeStore) RevokeFamilyLink(ctx context.Context, linkID, actorID string) error {
	return nil
}
func (f *fakeStore) SetFamilyLocationShare(ctx context.Context, linkID, actorID string, enabled bool) (store.FamilyLink, error) {
	return store.FamilyLink{}, nil
}
func (f *fakeStore) ListFamilyLinksForUser(ctx context.Context, userID string) ([]store.FamilyLink, error) {
	return nil, nil
}
func (f *fakeStore) ListAcceptedFamilyPeers(ctx context.Context, userID string) (map[string]bool, error) {
	return map[string]bool{}, nil
}
func (f *fakeStore) TouchNearbyPresence(ctx context.Context, observerID string, subjectIDs []string) error {
	return nil
}
func (f *fakeStore) ListFamilyGraceSubjects(ctx context.Context, observerID string, grace time.Duration) ([]store.PresenceGraceRow, error) {
	return nil, nil
}
func (f *fakeStore) CreateRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (string, error) {
	return "refresh-1", nil
}
func (f *fakeStore) GetValidRefreshToken(ctx context.Context, tokenHash string) (store.RefreshTokenRow, error) {
	return store.RefreshTokenRow{}, pgx.ErrNoRows
}
func (f *fakeStore) RevokeRefreshToken(ctx context.Context, id string, replacedBy *string) error {
	return nil
}
func (f *fakeStore) RevokeAllRefreshTokensForUser(ctx context.Context, userID string) error {
	return nil
}

type fakeHub struct {
	online      map[string]bool
	sentToUsers []string
	sentTypes   []string
}

func (h *fakeHub) SendToUser(userID string, msg ws.Outbound) {
	h.sentToUsers = append(h.sentToUsers, userID)
	h.sentTypes = append(h.sentTypes, msg.Type)
}

func (h *fakeHub) IsOnline(userID string) bool {
	return h.online[userID]
}

func newTestService(st *fakeStore, hb *fakeHub) *Service {
	return New(
		config.Config{
			JWTSecret:     "test-secret",
			JWTTTLMinutes:     30,
			JWTRefreshTTLDays: 30,
		},
		st,
		hb,
		slog.Default(),
	)
}

func TestUpdateUserRejectsCrossUserAccess(t *testing.T) {
	st := &fakeStore{}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	_, err := svc.UpdateUser(context.Background(), "actor-a", "target-b", UpdateUserInput{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestUpdateUserReturnsNotFoundWhenUserMissing(t *testing.T) {
	st := &fakeStore{
		getUserByIDFn: func(ctx context.Context, userID string) (store.User, error) {
			return store.User{}, pgx.ErrNoRows
		},
	}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	_, err := svc.UpdateUser(context.Background(), "user-1", "user-1", UpdateUserInput{})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestSendMessagePersistsAndBroadcasts(t *testing.T) {
	var capturedDelivered bool
	var capturedClientMsgID string
	st := &fakeStore{
		insertMessageFn: func(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (store.Message, error) {
			capturedDelivered = isDelivered
			capturedClientMsgID = clientMsgID
			return store.Message{
				ID:          "msg-1",
				SenderID:    senderID,
				ReceiverID:  receiverID,
				Content:     content,
				ClientMsgID: clientMsgID,
				Timestamp:   time.Now(),
				IsDelivered: isDelivered,
				IsRead:      false,
			}, nil
		},
	}
	hb := &fakeHub{online: map[string]bool{"user-2": true}}
	svc := newTestService(st, hb)

	msg, err := svc.SendMessage(context.Background(), "user-1", "user-2", "hello", "client-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !capturedDelivered {
		t.Fatalf("expected delivered=true when receiver is online")
	}
	if capturedClientMsgID != "client-1" {
		t.Fatalf("expected clientMsgId client-1, got %s", capturedClientMsgID)
	}
	if msg.ID != "msg-1" {
		t.Fatalf("expected msg id msg-1, got %s", msg.ID)
	}
	if len(hb.sentToUsers) < 1 || hb.sentToUsers[0] != "user-2" || hb.sentTypes[0] != "newMessage" {
		t.Fatalf("expected newMessage to user-2 first, got users=%+v types=%+v", hb.sentToUsers, hb.sentTypes)
	}
	if len(hb.sentTypes) < 2 || hb.sentTypes[1] != "ack" {
		t.Fatalf("expected ack to sender, got types=%+v", hb.sentTypes)
	}
	if len(hb.sentTypes) < 3 || hb.sentTypes[2] != "delivered" {
		t.Fatalf("expected delivered to sender when online, got types=%+v", hb.sentTypes)
	}
}

func TestSendMessageIdempotentByClientMsgID(t *testing.T) {
	insertCalls := 0
	existing := store.Message{
		ID:          "msg-existing",
		SenderID:    "user-1",
		ReceiverID:  "user-2",
		Content:     "hello",
		ClientMsgID: "client-1",
		Timestamp:   time.Now(),
	}
	st := &fakeStore{
		findByClientMsgIDFn: func(ctx context.Context, senderID, clientMsgID string) (store.Message, error) {
			if senderID == "user-1" && clientMsgID == "client-1" {
				return existing, nil
			}
			return store.Message{}, pgx.ErrNoRows
		},
		insertMessageFn: func(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (store.Message, error) {
			insertCalls++
			return store.Message{}, nil
		},
	}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	msg, err := svc.SendMessage(context.Background(), "user-1", "user-2", "hello", "client-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ID != "msg-existing" {
		t.Fatalf("expected existing message, got %s", msg.ID)
	}
	if insertCalls != 0 {
		t.Fatalf("expected no insert on idempotent hit, got %d", insertCalls)
	}
	if len(hb.sentToUsers) != 0 {
		t.Fatalf("expected no broadcast on idempotent hit, got %+v", hb.sentToUsers)
	}
}

func TestLoginReturnsInvalidCredsWhenPasswordMismatch(t *testing.T) {
	hash, err := security.HashPassword("correct-password")
	if err != nil {
		t.Fatalf("failed to build test hash: %v", err)
	}
	st := &fakeStore{
		getAuthUserByEmailFn: func(ctx context.Context, email string) (store.AuthUser, error) {
			return store.AuthUser{
				ID:           "user-1",
				Email:        "user@example.com",
				PasswordHash: hash,
				DisplayName:  "User",
			}, nil
		},
	}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	_, err = svc.Login(context.Background(), RegisterInput{
		Email:    "user@example.com",
		Password: "wrong-password",
	})
	if !errors.Is(err, ErrInvalidCreds) {
		t.Fatalf("expected ErrInvalidCreds, got %v", err)
	}
}

func TestLoginReturnsTokenForValidCredentials(t *testing.T) {
	hash, err := security.HashPassword("correct-password")
	if err != nil {
		t.Fatalf("failed to build test hash: %v", err)
	}
	st := &fakeStore{
		getAuthUserByEmailFn: func(ctx context.Context, email string) (store.AuthUser, error) {
			return store.AuthUser{
				ID:           "user-1",
				Email:        "user@example.com",
				PasswordHash: hash,
				DisplayName:  "User",
			}, nil
		},
	}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	result, err := svc.Login(context.Background(), RegisterInput{
		Email:    "user@example.com",
		Password: "correct-password",
	})
	if err != nil {
		t.Fatalf("unexpected login error: %v", err)
	}
	if result.AccessToken == "" {
		t.Fatalf("expected non-empty access token")
	}
	if result.User.ID != "user-1" {
		t.Fatalf("expected user id user-1, got %s", result.User.ID)
	}
	if result.User.Email != "user@example.com" {
		t.Fatalf("expected user email user@example.com, got %s", result.User.Email)
	}
}

func TestUploadKeysMapsStoreErrorToTxFailed(t *testing.T) {
	st := &fakeStore{
		uploadKeysFn: func(ctx context.Context, userID string, in store.KeyUploadInput) error {
			return errors.New("db write failed")
		},
	}
	hb := &fakeHub{online: map[string]bool{}}
	svc := newTestService(st, hb)

	err := svc.UploadKeys(context.Background(), "user-1", store.KeyUploadInput{
		IdentityKey:  "identity",
		PublicKey:    "pub",
		Registration: 1,
		SignedPreKey: map[string]any{"keyId": 1},
	})
	if !errors.Is(err, ErrTxFailed) {
		t.Fatalf("expected ErrTxFailed, got %v", err)
	}
}
