package ws

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"chatup/backend-go/internal/security"
	"github.com/gorilla/websocket"
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
}

func (h *Hub) SendToUser(userID string, msg Outbound) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients[userID] {
		select {
		case c.Send <- msg:
		default:
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

func (h *Hub) ServeWS(secret string, handler func(userID string, env Envelope)) http.HandlerFunc {
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
			handler(client.UserID, env)
		}

		h.Unregister(client)
	}
}
