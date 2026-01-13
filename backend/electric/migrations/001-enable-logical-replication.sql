-- Electric SQL Migration: Enable Logical Replication
-- This migration ensures PostgreSQL is configured for Electric SQL

-- Enable logical replication (if not already enabled)
-- Note: This may require PostgreSQL restart
DO $$
BEGIN
  -- Check if wal_level is already logical
  IF current_setting('wal_level') != 'logical' THEN
    -- Try to set it (may require superuser and restart)
    PERFORM set_config('wal_level', 'logical', false);
    RAISE NOTICE 'wal_level set to logical. PostgreSQL restart may be required.';
  END IF;
END $$;

-- Ensure max_replication_slots is sufficient
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;

-- Create publication for Electric SQL (if tables exist)
-- This will be created after tables are created by TypeORM
DO $$
BEGIN
  -- Check if publication already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication'
  ) THEN
    -- Create publication (will fail if tables don't exist yet, that's OK)
    BEGIN
      CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
      RAISE NOTICE 'Publication electric_publication created';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Publication creation skipped (tables may not exist yet): %', SQLERRM;
    END;
  END IF;
END $$;
