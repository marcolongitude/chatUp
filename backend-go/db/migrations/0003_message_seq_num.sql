-- Stable ordering for chat messages (apply after 0002; OPS pending).
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS seq_num BIGINT;

-- Backfill existing rows in timestamp order (global sequence is enough for pair filtering).
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY timestamp ASC, id ASC) AS rn
  FROM messages
  WHERE seq_num IS NULL
)
UPDATE messages m
SET seq_num = ordered.rn
FROM ordered
WHERE m.id = ordered.id;

CREATE SEQUENCE IF NOT EXISTS messages_seq_num_seq;

SELECT setval(
  'messages_seq_num_seq',
  GREATEST(COALESCE((SELECT MAX(seq_num) FROM messages), 0), 1),
  true
);

ALTER TABLE messages
  ALTER COLUMN seq_num SET DEFAULT nextval('messages_seq_num_seq');

ALTER TABLE messages
  ALTER COLUMN seq_num SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_pair_seq
  ON messages (
    LEAST(sender_id::text, receiver_id::text),
    GREATEST(sender_id::text, receiver_id::text),
    seq_num
  );
