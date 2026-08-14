-- Family mode: mutual consent links + optional location share + nearby grace presence.

CREATE TABLE IF NOT EXISTS family_links (
  id UUID PRIMARY KEY,
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  -- Each side opts into sharing location with the other; both must be true.
  location_share_a BOOLEAN NOT NULL DEFAULT FALSE,
  location_share_b BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT family_links_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT family_links_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_family_links_user_a ON family_links (user_a_id) WHERE status <> 'revoked';
CREATE INDEX IF NOT EXISTS idx_family_links_user_b ON family_links (user_b_id) WHERE status <> 'revoked';

-- Last time subject was geometrically inside observer's nearby radius.
CREATE TABLE IF NOT EXISTS nearby_presence (
  observer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_inside_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (observer_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_nearby_presence_observer_inside
  ON nearby_presence (observer_id, last_inside_at DESC);
