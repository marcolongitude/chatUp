-- Electric SQL Schema Definition
-- This file defines the tables that Electric will sync

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages table (already exists via TypeORM, but ensuring compatibility)
-- Electric will sync this table for real-time updates
-- Note: TypeORM will create this table, but we ensure structure matches
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Users table (already exists via TypeORM)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  phone_number VARCHAR(20),
  bio TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  public_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Keys table (Signal Protocol keys)
CREATE TABLE IF NOT EXISTS keys (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  identity_key TEXT NOT NULL,
  public_key TEXT,
  registration_id INTEGER NOT NULL,
  signed_pre_key JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pre-keys table
CREATE TABLE IF NOT EXISTS pre_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES keys(user_id) ON DELETE CASCADE,
  key_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  UNIQUE(user_id, key_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(sender_id, receiver_id, timestamp DESC);

-- Row Level Security (RLS) Policies
-- Users can only see messages where they are sender or receiver
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_policy ON messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY messages_insert_policy ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY messages_update_policy ON messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- Users can see their own data and public profile data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (true); -- Public profiles are visible

CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Keys are private to each user
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY keys_select_policy ON keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY keys_insert_policy ON keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY keys_update_policy ON keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Pre-keys follow same rules as keys
ALTER TABLE pre_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY pre_keys_select_policy ON pre_keys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM keys WHERE keys.user_id = pre_keys.user_id AND auth.uid() = keys.user_id
    )
  );

CREATE POLICY pre_keys_insert_policy ON pre_keys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM keys WHERE keys.user_id = pre_keys.user_id AND auth.uid() = keys.user_id
    )
  );

-- Create publication for logical replication (required by Electric)
CREATE PUBLICATION IF NOT EXISTS electric_publication FOR TABLE messages, users, keys, pre_keys;

