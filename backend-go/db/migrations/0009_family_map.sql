-- Family map tracking: member opt-in (map_share) + chef monitor (map_monitor).
-- Live pin requires both; revoke clears all map flags.

ALTER TABLE family_links
  ADD COLUMN IF NOT EXISTS map_share_a BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS map_share_b BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS map_monitor_a BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS map_monitor_b BOOLEAN NOT NULL DEFAULT FALSE;
