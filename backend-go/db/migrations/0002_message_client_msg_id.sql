-- Idempotency key for client-originated messages (retry-safe sends).
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_msg_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_client_msg
  ON messages (sender_id, client_msg_id)
  WHERE client_msg_id IS NOT NULL AND client_msg_id <> '';
