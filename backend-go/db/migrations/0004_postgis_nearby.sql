-- Spatial nearby queries (apply when PostGIS is available on the Postgres image; OPS pending).
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

UPDATE users
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_location_gist
  ON users USING GIST (location);
