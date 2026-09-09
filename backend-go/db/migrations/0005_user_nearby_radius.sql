-- Preferred discovery radius in km (1, 2 or 3). OPS pending.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nearby_radius_km SMALLINT NOT NULL DEFAULT 1
  CHECK (nearby_radius_km IN (1, 2, 3));
