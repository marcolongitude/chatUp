package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const FamilyStatusPending = "pending"
const FamilyStatusAccepted = "accepted"
const FamilyStatusRevoked = "revoked"

type FamilyLink struct {
	ID              string
	UserAID         string
	UserBID         string
	RequestedBy     string
	Status          string
	LocationShareA  bool
	LocationShareB  bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
	AcceptedAt      *time.Time
	PeerID          string // filled for list-from-actor perspective
	PeerName        string
	PeerAvatar      string
	MyLocationShare bool
	PeerLocationShare bool
	LocationShareActive bool // both sides true
}

func OrderedPair(a, b string) (string, string) {
	if a < b {
		return a, b
	}
	return b, a
}

func (s *Store) CreateFamilyLink(ctx context.Context, actorID, peerID string) (FamilyLink, error) {
	if actorID == peerID {
		return FamilyLink{}, ErrInvalidFamilyPair
	}
	a, b := OrderedPair(actorID, peerID)
	id := uuid.NewString()
	_, err := s.db.Exec(ctx, `
		INSERT INTO family_links (id, user_a_id, user_b_id, requested_by, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_a_id, user_b_id) DO UPDATE
		SET status = CASE
			WHEN family_links.status = 'revoked' THEN 'pending'
			ELSE family_links.status
		END,
		requested_by = CASE
			WHEN family_links.status = 'revoked' THEN EXCLUDED.requested_by
			ELSE family_links.requested_by
		END,
		location_share_a = CASE WHEN family_links.status = 'revoked' THEN FALSE ELSE family_links.location_share_a END,
		location_share_b = CASE WHEN family_links.status = 'revoked' THEN FALSE ELSE family_links.location_share_b END,
		accepted_at = CASE WHEN family_links.status = 'revoked' THEN NULL ELSE family_links.accepted_at END,
		updated_at = NOW()
		WHERE family_links.status = 'revoked' OR family_links.status = 'pending'
	`, id, a, b, actorID, FamilyStatusPending)
	if err != nil {
		return FamilyLink{}, err
	}
	return s.GetFamilyLinkByPair(ctx, a, b)
}

func (s *Store) GetFamilyLinkByID(ctx context.Context, id string) (FamilyLink, error) {
	var link FamilyLink
	err := s.db.QueryRow(ctx, `
		SELECT id, user_a_id, user_b_id, requested_by, status,
		       location_share_a, location_share_b, created_at, updated_at, accepted_at
		FROM family_links WHERE id = $1`, id).
		Scan(&link.ID, &link.UserAID, &link.UserBID, &link.RequestedBy, &link.Status,
			&link.LocationShareA, &link.LocationShareB, &link.CreatedAt, &link.UpdatedAt, &link.AcceptedAt)
	return link, err
}

func (s *Store) GetFamilyLinkByPair(ctx context.Context, userAID, userBID string) (FamilyLink, error) {
	var link FamilyLink
	err := s.db.QueryRow(ctx, `
		SELECT id, user_a_id, user_b_id, requested_by, status,
		       location_share_a, location_share_b, created_at, updated_at, accepted_at
		FROM family_links WHERE user_a_id = $1 AND user_b_id = $2`, userAID, userBID).
		Scan(&link.ID, &link.UserAID, &link.UserBID, &link.RequestedBy, &link.Status,
			&link.LocationShareA, &link.LocationShareB, &link.CreatedAt, &link.UpdatedAt, &link.AcceptedAt)
	return link, err
}

func (s *Store) AcceptFamilyLink(ctx context.Context, linkID, actorID string) (FamilyLink, error) {
	tag, err := s.db.Exec(ctx, `
		UPDATE family_links
		SET status = $3, accepted_at = NOW(), updated_at = NOW()
		WHERE id = $1
		  AND status = $2
		  AND requested_by <> $4
		  AND (user_a_id = $4 OR user_b_id = $4)
	`, linkID, FamilyStatusPending, FamilyStatusAccepted, actorID)
	if err != nil {
		return FamilyLink{}, err
	}
	if tag.RowsAffected() == 0 {
		return FamilyLink{}, ErrFamilyNotAcceptable
	}
	return s.GetFamilyLinkByID(ctx, linkID)
}

func (s *Store) RevokeFamilyLink(ctx context.Context, linkID, actorID string) error {
	tag, err := s.db.Exec(ctx, `
		UPDATE family_links
		SET status = $2, location_share_a = FALSE, location_share_b = FALSE, updated_at = NOW()
		WHERE id = $1 AND (user_a_id = $3 OR user_b_id = $3) AND status <> $2
	`, linkID, FamilyStatusRevoked, actorID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrFamilyNotFound
	}
	return nil
}

func (s *Store) SetFamilyLocationShare(ctx context.Context, linkID, actorID string, enabled bool) (FamilyLink, error) {
	link, err := s.GetFamilyLinkByID(ctx, linkID)
	if err != nil {
		return FamilyLink{}, err
	}
	if link.Status != FamilyStatusAccepted {
		return FamilyLink{}, ErrFamilyNotAccepted
	}
	if actorID != link.UserAID && actorID != link.UserBID {
		return FamilyLink{}, ErrFamilyForbidden
	}

	if actorID == link.UserAID {
		_, err = s.db.Exec(ctx, `UPDATE family_links SET location_share_a = $2, updated_at = NOW() WHERE id = $1`, linkID, enabled)
	} else {
		_, err = s.db.Exec(ctx, `UPDATE family_links SET location_share_b = $2, updated_at = NOW() WHERE id = $1`, linkID, enabled)
	}
	if err != nil {
		return FamilyLink{}, err
	}
	return s.GetFamilyLinkByID(ctx, linkID)
}

func (s *Store) ListFamilyLinksForUser(ctx context.Context, userID string) ([]FamilyLink, error) {
	rows, err := s.db.Query(ctx, `
		SELECT fl.id, fl.user_a_id, fl.user_b_id, fl.requested_by, fl.status,
		       fl.location_share_a, fl.location_share_b, fl.created_at, fl.updated_at, fl.accepted_at,
		       CASE WHEN fl.user_a_id = $1 THEN fl.user_b_id ELSE fl.user_a_id END AS peer_id,
		       COALESCE(u.display_name, split_part(u.email,'@',1), '') AS peer_name,
		       COALESCE(u.photo_url, '') AS peer_avatar
		FROM family_links fl
		JOIN users u ON u.id = CASE WHEN fl.user_a_id = $1 THEN fl.user_b_id ELSE fl.user_a_id END
		WHERE (fl.user_a_id = $1 OR fl.user_b_id = $1)
		  AND fl.status IN ('pending', 'accepted')
		ORDER BY fl.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]FamilyLink, 0)
	for rows.Next() {
		var link FamilyLink
		if err := rows.Scan(
			&link.ID, &link.UserAID, &link.UserBID, &link.RequestedBy, &link.Status,
			&link.LocationShareA, &link.LocationShareB, &link.CreatedAt, &link.UpdatedAt, &link.AcceptedAt,
			&link.PeerID, &link.PeerName, &link.PeerAvatar,
		); err != nil {
			return nil, err
		}
		if userID == link.UserAID {
			link.MyLocationShare = link.LocationShareA
			link.PeerLocationShare = link.LocationShareB
		} else {
			link.MyLocationShare = link.LocationShareB
			link.PeerLocationShare = link.LocationShareA
		}
		link.LocationShareActive = link.LocationShareA && link.LocationShareB
		out = append(out, link)
	}
	return out, nil
}

// ListAcceptedFamilyPeers returns peerID -> locationShareActive for accepted links.
func (s *Store) ListAcceptedFamilyPeers(ctx context.Context, userID string) (map[string]bool, error) {
	rows, err := s.db.Query(ctx, `
		SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS peer_id,
		       (location_share_a AND location_share_b) AS location_active
		FROM family_links
		WHERE status = $2 AND (user_a_id = $1 OR user_b_id = $1)
	`, userID, FamilyStatusAccepted)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]bool)
	for rows.Next() {
		var peerID string
		var active bool
		if err := rows.Scan(&peerID, &active); err != nil {
			return nil, err
		}
		out[peerID] = active
	}
	return out, nil
}

func (s *Store) TouchNearbyPresence(ctx context.Context, observerID string, subjectIDs []string) error {
	if len(subjectIDs) == 0 {
		return nil
	}
	for _, subjectID := range subjectIDs {
		_, err := s.db.Exec(ctx, `
			INSERT INTO nearby_presence (observer_id, subject_id, last_inside_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (observer_id, subject_id)
			DO UPDATE SET last_inside_at = NOW()
		`, observerID, subjectID)
		if err != nil {
			return err
		}
	}
	return nil
}

type PresenceGraceRow struct {
	SubjectID    string
	Name         string
	Avatar       string
	LastInsideAt time.Time
}

func (s *Store) ListFamilyGraceSubjects(ctx context.Context, observerID string, grace time.Duration) ([]PresenceGraceRow, error) {
	cutoff := time.Now().UTC().Add(-grace)
	rows, err := s.db.Query(ctx, `
		SELECT np.subject_id,
		       COALESCE(u.display_name, split_part(u.email,'@',1), '') AS name,
		       COALESCE(u.photo_url, '') AS avatar,
		       np.last_inside_at
		FROM nearby_presence np
		JOIN family_links fl ON fl.status = 'accepted'
		  AND (
		    (fl.user_a_id = $1 AND fl.user_b_id = np.subject_id)
		    OR (fl.user_b_id = $1 AND fl.user_a_id = np.subject_id)
		  )
		  AND NOT (fl.location_share_a AND fl.location_share_b)
		JOIN users u ON u.id = np.subject_id
		WHERE np.observer_id = $1
		  AND np.last_inside_at >= $2
	`, observerID, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]PresenceGraceRow, 0)
	for rows.Next() {
		var row PresenceGraceRow
		if err := rows.Scan(&row.SubjectID, &row.Name, &row.Avatar, &row.LastInsideAt); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, nil
}
