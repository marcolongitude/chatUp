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
	ID             string
	Email          string
	DisplayName    string
	PhotoURL       string
	PhoneNumber    string
	Bio            string
	PublicKey      *string
	NearbyRadiusKm int
	CreatedAt      time.Time
	UpdatedAt      time.Time
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
	err := s.db.QueryRow(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(phone_number,''),COALESCE(bio,''),public_key,COALESCE(nearby_radius_km,1),created_at,updated_at FROM users WHERE id=$1`, userID).
		Scan(&out.ID, &out.Email, &out.DisplayName, &out.PhotoURL, &out.PhoneNumber, &out.Bio, &out.PublicKey, &out.NearbyRadiusKm, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		// Fallback before migration 0005.
		err = s.db.QueryRow(ctx, `SELECT id,email,COALESCE(display_name,''),COALESCE(photo_url,''),COALESCE(phone_number,''),COALESCE(bio,''),public_key,created_at,updated_at FROM users WHERE id=$1`, userID).
			Scan(&out.ID, &out.Email, &out.DisplayName, &out.PhotoURL, &out.PhoneNumber, &out.Bio, &out.PublicKey, &out.CreatedAt, &out.UpdatedAt)
		if err != nil {
			return User{}, err
		}
		out.NearbyRadiusKm = 1
	}
	return out, nil
}

type UpdateUserInput struct {
	DisplayName    *string
	PhotoURL       *string
	Bio            *string
	PhoneNumber    *string
	PublicKey      *string
	NearbyRadiusKm *int
}

func (s *Store) UpdateUser(ctx context.Context, userID string, in UpdateUserInput) error {
	_, err := s.db.Exec(ctx, `UPDATE users SET
		display_name=COALESCE($2,display_name),
		photo_url=COALESCE($3,photo_url),
		bio=COALESCE($4,bio),
		phone_number=COALESCE($5,phone_number),
		public_key=COALESCE($6,public_key),
		nearby_radius_km=COALESCE($7,nearby_radius_km),
		updated_at=NOW()
		WHERE id=$1`,
		userID, in.DisplayName, in.PhotoURL, in.Bio, in.PhoneNumber, in.PublicKey, in.NearbyRadiusKm)
	if err != nil && in.NearbyRadiusKm == nil {
		_, err = s.db.Exec(ctx, `UPDATE users SET display_name=COALESCE($2,display_name), photo_url=COALESCE($3,photo_url), bio=COALESCE($4,bio), phone_number=COALESCE($5,phone_number), public_key=COALESCE($6,public_key), updated_at=NOW() WHERE id=$1`,
			userID, in.DisplayName, in.PhotoURL, in.Bio, in.PhoneNumber, in.PublicKey)
	}
	return err
}

type Message struct {
	ID          string
	SenderID    string
	ReceiverID  string
	Content     string
	ClientMsgID string
	SeqNum      int64
	Timestamp   time.Time
	IsDelivered bool
	IsRead      bool
}

func (s *Store) FindMessageByClientMsgID(ctx context.Context, senderID, clientMsgID string) (Message, error) {
	var m Message
	err := s.db.QueryRow(ctx, `SELECT id,sender_id,receiver_id,content,COALESCE(client_msg_id,''),COALESCE(seq_num,0),timestamp,is_delivered,is_read
		FROM messages WHERE sender_id=$1 AND client_msg_id=$2`, senderID, clientMsgID).
		Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.ClientMsgID, &m.SeqNum, &m.Timestamp, &m.IsDelivered, &m.IsRead)
	if err != nil {
		return Message{}, err
	}
	return m, nil
}

func (s *Store) InsertMessage(ctx context.Context, senderID, receiverID, content string, isDelivered bool, clientMsgID string) (Message, error) {
	id := uuid.NewString()
	var ts time.Time
	var seqNum int64
	var storedClientMsgID *string
	if clientMsgID != "" {
		storedClientMsgID = &clientMsgID
	}
	err := s.db.QueryRow(ctx, `INSERT INTO messages(id,sender_id,receiver_id,content,timestamp,is_delivered,is_read,client_msg_id)
		VALUES($1,$2,$3,$4,NOW(),$5,false,$6)
		RETURNING timestamp, COALESCE(seq_num, 0)`,
		id, senderID, receiverID, content, isDelivered, storedClientMsgID).Scan(&ts, &seqNum)
	if err != nil {
		return Message{}, err
	}
	return Message{
		ID:          id,
		SenderID:    senderID,
		ReceiverID:  receiverID,
		Content:     content,
		ClientMsgID: clientMsgID,
		SeqNum:      seqNum,
		Timestamp:   ts,
		IsDelivered: isDelivered,
		IsRead:      false,
	}, nil
}

func (s *Store) ListMessages(ctx context.Context, userID, contactID string, limit, offset int) ([]Message, error) {
	rows, err := s.db.Query(ctx, `SELECT id,sender_id,receiver_id,content,COALESCE(client_msg_id,''),COALESCE(seq_num,0),timestamp,is_delivered,is_read
		FROM messages
		WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
		ORDER BY CASE WHEN seq_num > 0 THEN seq_num ELSE EXTRACT(EPOCH FROM timestamp)::bigint END DESC
		LIMIT $3 OFFSET $4`, userID, contactID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Message, 0)
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.ClientMsgID, &m.SeqNum, &m.Timestamp, &m.IsDelivered, &m.IsRead); err != nil {
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

	// Keep users.public_key in sync with the Stable/Signal identity used for E2EE.
	pub := in.PublicKey
	if pub == "" {
		pub = in.IdentityKey
	}
	if pub != "" {
		if _, err := tx.Exec(ctx, `UPDATE users SET public_key=$2, updated_at=NOW() WHERE id=$1`, userID, pub); err != nil {
			return err
		}
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
	// Prefer syncing PostGIS geography when migration 0004 is applied.
	_, err := s.db.Exec(ctx, `
		UPDATE users
		SET latitude=$2,
		    longitude=$3,
		    location = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
		    updated_at=NOW()
		WHERE id=$1`, userID, latitude, longitude)
	if err != nil {
		_, err = s.db.Exec(ctx, `UPDATE users SET latitude=$2, longitude=$3, updated_at=NOW() WHERE id=$1`, userID, latitude, longitude)
	}
	return err
}

type UserLocationDistance struct {
	UserLocation
	DistanceM int
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

// ListUsersNearby uses PostGIS when available (migration 0004). Caller should fall back on error.
func (s *Store) ListUsersNearby(ctx context.Context, exceptUserID string, latitude, longitude, radiusMeters float64) ([]UserLocationDistance, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id,
		       email,
		       COALESCE(display_name,''),
		       COALESCE(photo_url,''),
		       ST_Y(location::geometry) AS latitude,
		       ST_X(location::geometry) AS longitude,
		       ST_Distance(location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography)::int AS distance_m
		FROM users
		WHERE id <> $1
		  AND location IS NOT NULL
		  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4)
		ORDER BY distance_m ASC
		LIMIT 200`, exceptUserID, latitude, longitude, radiusMeters)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]UserLocationDistance, 0)
	for rows.Next() {
		var u UserLocationDistance
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Avatar, &u.Latitude, &u.Longitude, &u.DistanceM); err != nil {
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
