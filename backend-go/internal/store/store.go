package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

type User struct {
	ID          string
	Email       string
	DisplayName string
	PhotoURL    string
	PhoneNumber string
	Bio         string
	PublicKey   *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type AuthUser struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
}

type SearchUser struct {
	ID          string
	Email       string
	DisplayName string
	PhotoURL    string
	Bio         string
}

type UserLocation struct {
	ID        string
	Email     string
	Name      string
	Avatar    string
	Latitude  float64
	Longitude float64
}

func (s *Store) CreateUser(ctx context.Context, email, passwordHash, displayName string) (User, error) {
	id := uuid.NewString()
	_, err := s.db.Exec(ctx, `INSERT INTO users(id,email,password_hash,display_name,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())`, id, email, passwordHash, displayName)
	if err != nil {
		return User{}, err
	}
	return User{
		ID:          id,
		Email:       email,
		DisplayName: displayName,
	}, nil
}

func (s *Store) GetAuthUserByEmail(ctx context.Context, email string) (AuthUser, error) {
	var out AuthUser
	err := s.db.QueryRow(ctx, `SELECT id,email,password_hash,COALESCE(display_name,'') FROM users WHERE email=$1`, email).
		Scan(&out.ID, &out.Email, &out.PasswordHash, &out.DisplayName)
	if err != nil {
		return AuthUser{}, err
	}
	return out, nil
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (User, error) {
	var out User
	err := s.db.QueryRow(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(phone_number,''),COALESCE(bio,''),public_key,created_at,updated_at FROM users WHERE email=$1`, email).
		Scan(&out.ID, &out.Email, &out.DisplayName, &out.PhotoURL, &out.PhoneNumber, &out.Bio, &out.PublicKey, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return User{}, err
	}
	return out, nil
}

func (s *Store) CreateGoogleUser(ctx context.Context, email, googleID, displayName string) (User, error) {
	id := uuid.NewString()
	_, err := s.db.Exec(ctx, `INSERT INTO users(id,email,google_id,display_name,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())`, id, email, googleID, displayName)
	if err != nil {
		return User{}, err
	}
	return User{
		ID:          id,
		Email:       email,
		DisplayName: displayName,
	}, nil
}

func (s *Store) SearchUsers(ctx context.Context, term string) ([]SearchUser, error) {
	q := "%" + term + "%"
	rows, err := s.db.Query(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(bio,'') FROM users WHERE email ILIKE $1 OR display_name ILIKE $1 LIMIT 30`, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]SearchUser, 0)
	for rows.Next() {
		var u SearchUser
		if err := rows.Scan(&u.ID, &u.Email, &u.DisplayName, &u.PhotoURL, &u.Bio); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

func (s *Store) GetUserByID(ctx context.Context, userID string) (User, error) {
	var out User
	err := s.db.QueryRow(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(phone_number,''),COALESCE(bio,''),public_key,created_at,updated_at FROM users WHERE id=$1`, userID).
		Scan(&out.ID, &out.Email, &out.DisplayName, &out.PhotoURL, &out.PhoneNumber, &out.Bio, &out.PublicKey, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return User{}, err
	}
	return out, nil
}

type UpdateUserInput struct {
	DisplayName *string
	PhotoURL    *string
	Bio         *string
	PhoneNumber *string
	PublicKey   *string
}

func (s *Store) UpdateUser(ctx context.Context, userID string, in UpdateUserInput) error {
	_, err := s.db.Exec(ctx, `UPDATE users SET display_name=COALESCE($2,display_name), photo_url=COALESCE($3,photo_url), bio=COALESCE($4,bio), phone_number=COALESCE($5,phone_number), public_key=COALESCE($6,public_key), updated_at=NOW() WHERE id=$1`,
		userID, in.DisplayName, in.PhotoURL, in.Bio, in.PhoneNumber, in.PublicKey)
	return err
}

type Message struct {
	ID          string
	SenderID    string
	ReceiverID  string
	Content     string
	Timestamp   time.Time
	IsDelivered bool
	IsRead      bool
}

func (s *Store) InsertMessage(ctx context.Context, senderID, receiverID, content string, isDelivered bool) (Message, error) {
	id := uuid.NewString()
	var ts time.Time
	err := s.db.QueryRow(ctx, `INSERT INTO messages(id,sender_id,receiver_id,content,timestamp,is_delivered,is_read) VALUES($1,$2,$3,$4,NOW(),$5,false) RETURNING timestamp`,
		id, senderID, receiverID, content, isDelivered).Scan(&ts)
	if err != nil {
		return Message{}, err
	}
	return Message{
		ID:          id,
		SenderID:    senderID,
		ReceiverID:  receiverID,
		Content:     content,
		Timestamp:   ts,
		IsDelivered: isDelivered,
		IsRead:      false,
	}, nil
}

func (s *Store) ListMessages(ctx context.Context, userID, contactID string, limit, offset int) ([]Message, error) {
	rows, err := s.db.Query(ctx, `SELECT id,sender_id,receiver_id,content,timestamp,is_delivered,is_read
		FROM messages
		WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
		ORDER BY timestamp DESC LIMIT $3 OFFSET $4`, userID, contactID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Message, 0)
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.Timestamp, &m.IsDelivered, &m.IsRead); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}

type KeyUploadInput struct {
	IdentityKey  string
	PublicKey    string
	Registration int
	SignedPreKey map[string]any
	PreKeys      []PreKey
}

type PreKey struct {
	KeyID     int
	PublicKey string
}

func (s *Store) UploadKeys(ctx context.Context, userID string, in KeyUploadInput) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	spk, err := json.Marshal(in.SignedPreKey)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `INSERT INTO keys(user_id,identity_key,public_key,registration_id,signed_pre_key,updated_at)
		VALUES($1,$2,$3,$4,$5,NOW())
		ON CONFLICT (user_id) DO UPDATE SET identity_key=EXCLUDED.identity_key, public_key=EXCLUDED.public_key, registration_id=EXCLUDED.registration_id, signed_pre_key=EXCLUDED.signed_pre_key, updated_at=NOW()`,
		userID, in.IdentityKey, in.PublicKey, in.Registration, spk)
	if err != nil {
		return err
	}

	if len(in.PreKeys) > 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM pre_keys WHERE user_id=$1`, userID); err != nil {
			return err
		}
		for _, pk := range in.PreKeys {
			if _, err := tx.Exec(ctx, `INSERT INTO pre_keys(id,user_id,key_id,public_key,created_at) VALUES($1,$2,$3,$4,NOW())`,
				uuid.NewString(), userID, pk.KeyID, pk.PublicKey); err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

func (s *Store) CountPreKeys(ctx context.Context, userID string) (int, error) {
	var c int
	err := s.db.QueryRow(ctx, `SELECT COUNT(*) FROM pre_keys WHERE user_id=$1`, userID).Scan(&c)
	return c, err
}

type KeyBundle struct {
	IdentityKey  string
	PublicKey    string
	Registration int
	SignedPreKey map[string]any
	PreKey       *PreKey
}

func (s *Store) GetAndConsumeKeyBundle(ctx context.Context, userID string) (KeyBundle, bool, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return KeyBundle{}, false, err
	}
	defer tx.Rollback(ctx)

	var bundle KeyBundle
	var signed []byte
	if err := tx.QueryRow(ctx, `SELECT identity_key,COALESCE(public_key,''),registration_id,signed_pre_key FROM keys WHERE user_id=$1`, userID).
		Scan(&bundle.IdentityKey, &bundle.PublicKey, &bundle.Registration, &signed); err != nil {
		if err == pgx.ErrNoRows {
			return KeyBundle{}, false, nil
		}
		return KeyBundle{}, false, err
	}

	var preKeyRowID string
	var preKey PreKey
	err = tx.QueryRow(ctx, `SELECT id,key_id,public_key FROM pre_keys WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`, userID).
		Scan(&preKeyRowID, &preKey.KeyID, &preKey.PublicKey)
	if err != nil && err != pgx.ErrNoRows {
		return KeyBundle{}, false, err
	}
	if preKeyRowID != "" {
		bundle.PreKey = &preKey
		if _, err := tx.Exec(ctx, `DELETE FROM pre_keys WHERE id=$1`, preKeyRowID); err != nil {
			return KeyBundle{}, false, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return KeyBundle{}, false, err
	}

	if err := json.Unmarshal(signed, &bundle.SignedPreKey); err != nil {
		return KeyBundle{}, false, err
	}
	return bundle, true, nil
}

func (s *Store) UpdateLocation(ctx context.Context, userID string, latitude, longitude float64) error {
	_, err := s.db.Exec(ctx, `UPDATE users SET latitude=$2, longitude=$3, updated_at=NOW() WHERE id=$1`, userID, latitude, longitude)
	return err
}

func (s *Store) ListUsersWithLocation(ctx context.Context, exceptUserID string) ([]UserLocation, error) {
	rows, err := s.db.Query(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),latitude,longitude
		FROM users WHERE id <> $1 AND latitude IS NOT NULL AND longitude IS NOT NULL`, exceptUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]UserLocation, 0)
	for rows.Next() {
		var u UserLocation
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Avatar, &u.Latitude, &u.Longitude); err != nil {
			return nil, err
		}
		if u.Name == "" {
			u.Name = strings.Split(u.Email, "@")[0]
		}
		out = append(out, u)
	}
	return out, nil
}

func PtrStringFromAny(v any) *string {
	if v == nil {
		return nil
	}
	s := fmt.Sprint(v)
	if s == "" || s == "<nil>" {
		return nil
	}
	return &s
}

func FirstNonEmpty(candidates ...*string) *string {
	for _, c := range candidates {
		if c != nil && *c != "" {
			return c
		}
	}
	return nil
}

func IntFromAny(v any) int {
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
