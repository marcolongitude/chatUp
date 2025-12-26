-- Initialization script for PostgreSQL to support Electric SQL
-- This script sets up logical replication and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure wal_level is set to logical (should be set in postgresql.conf or via command)
-- This is typically done via docker-compose command or postgresql.conf

-- Create publication for Electric SQL (if not exists)
-- This allows Electric to subscribe to changes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
        CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
    END IF;
END $$;

-- Note: RLS policies are created in schema.sql
-- This script just ensures the publication exists

