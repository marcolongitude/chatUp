-- Track last GPS push separately from profile updated_at (stale discovery filter).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

UPDATE users
SET location_updated_at = updated_at
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location_updated_at IS NULL;
