-- name: ListMessagesByContact :many
SELECT id, sender_id, receiver_id, content, timestamp, is_delivered, is_read
FROM messages
WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
ORDER BY timestamp DESC
LIMIT $3 OFFSET $4;

-- name: InsertMessage :one
INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, is_delivered, is_read)
VALUES ($1, $2, $3, $4, NOW(), $5, FALSE)
RETURNING id, sender_id, receiver_id, content, timestamp, is_delivered, is_read;
