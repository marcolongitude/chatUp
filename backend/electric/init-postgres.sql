-- Initialization script for PostgreSQL to support Electric SQL
-- This script sets up logical replication

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure wal_level is set to logical (should be set in postgresql.conf or via command)
-- This is typically done via docker-compose command or Dockerfile

-- Note: Publication will be created AFTER tables exist
-- The backend migrations will create the tables
-- Then we can create the publication manually or via migration

-- For now, just ensure extensions are available
-- The publication creation is moved to a separate migration

