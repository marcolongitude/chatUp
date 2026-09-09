package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"chatup/backend-go/internal/observability"
	"chatup/backend-go/internal/security"
	"github.com/gorilla/websocket"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

type Envelope struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type Outbound struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Client struct {
	Conn   *websocket.Conn
	UserID string
	Send   chan Outbound
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]struct{}
	logger  *slog.Logger
}

var wsTracer = otel.Tracer("chatup/backend-go/ws")

func NewHub(logger *slog.Logger) *Hub {
	return &Hub{clients: make(map[string]map[*Client]struct{}), logger: logger}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[c.UserID] == nil {
		h.clients[c.UserID] = make(map[*Client]struct{})
	}
	h.clients[c.UserID][c] = struct{}{}
	observability.IncWSConnection()
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[c.UserID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.clients, c.UserID)
		}
	}
	close(c.Send)
	observability.DecWSConnection()
}

func (h *Hub) SendToUser(userID string, msg Outbound) {
	_, span := wsTracer.Start(context.Background(), "ws.send_to_user")
	span.SetAttributes(
		attribute.String("ws.user_id", userID),
		attribute.String("ws.event_type", msg.Type),
	)
	defer span.End()

	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients[userID] {
		select {
		case c.Send <- msg:
		default:
			// Non-blocking send: log drop instead of silent discard under backpressure.
			if h.logger != nil {
				h.logger.Warn("websocket send dropped", "userId", userID, "type", msg.Type)
			}
		}
	}
}

func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[userID]) > 0
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Hub) ServeWS(secret string, handler func(userID string, env Envelope), onConnect ...func(userID string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		claims, err := security.ParseToken(secret, token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		client := &Client{Conn: conn, UserID: claims.Sub, Send: make(chan Outbound, 64)}
		h.Register(client)
		if len(onConnect) > 0 && onConnect[0] != nil {
			go onConnect[0](client.UserID)
		}

		go func() {
			defer conn.Close()
			ticker := time.NewTicker(25 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case msg, ok := <-client.Send:
					if !ok {
						return
					}
					observability.IncWSOutbound(msg.Type)
					_ = conn.WriteJSON(msg)
				case <-ticker.C:
					_ = conn.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
				}
			}
		}()

		for {
			var env Envelope
			if err := conn.ReadJSON(&env); err != nil {
				break
			}
			_, span := wsTracer.Start(context.Background(), "ws.receive")
			span.SetAttributes(
				attribute.String("ws.user_id", client.UserID),
				attribute.String("ws.event_type", env.Type),
			)
			observability.IncWSInbound(env.Type)
			handler(client.UserID, env)
			span.End()
		}

		h.Unregister(client)
	}
}
