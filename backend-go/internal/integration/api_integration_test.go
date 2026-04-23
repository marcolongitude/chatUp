//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"chatup/backend-go/internal/config"
	"chatup/backend-go/internal/httpserver"
	"chatup/backend-go/internal/ws"
	"github.com/jackc/pgx/v5/pgxpool"
)

func setupIntegrationServer(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)

	db, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("failed to connect db: %v", err)
	}
	t.Cleanup(db.Close)

	migrationSQL, err := os.ReadFile("../../db/migrations/0001_init.sql")
	if err != nil {
		t.Fatalf("failed to read migration: %v", err)
	}
	if _, err := db.Exec(ctx, string(migrationSQL)); err != nil {
		t.Fatalf("failed to apply migration: %v", err)
	}

	resetDB(t, db)

	cfg := config.Config{
		JWTSecret:     "integration-secret",
		JWTTTLMinutes: 60,
		CORSOrigin:    "*",
		UploadDir:     t.TempDir(),
		ServiceName:   "chatup-backend-go-test",
	}
	router := httpserver.NewRouter(cfg, db, ws.NewHub(slog.Default()), slog.Default())
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)
	return server, db
}

func resetDB(t *testing.T, db *pgxpool.Pool) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := db.Exec(ctx, `TRUNCATE TABLE messages, pre_keys, keys, users CASCADE`)
	if err != nil {
		t.Fatalf("failed to clean db: %v", err)
	}
}

func postJSON(t *testing.T, client *http.Client, url string, body any, token string) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request error: %v", err)
	}
	return resp
}

func putJSON(t *testing.T, client *http.Client, url string, body any, token string) *http.Response {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request error: %v", err)
	}
	return resp
}

func readJSONBody(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body error: %v", err)
	}
	out := map[string]any{}
	if len(raw) == 0 {
		return out
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("invalid json response: %v body=%s", err, string(raw))
	}
	return out
}

func TestIntegrationAuthProtectedFlow(t *testing.T) {
	server, db := setupIntegrationServer(t)
	resetDB(t, db)

	resp := postJSON(t, server.Client(), server.URL+"/auth/register", map[string]any{
		"email":       "user1@example.com",
		"password":    "secret-123",
		"displayName": "User One",
	}, "")
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
	registerData := readJSONBody(t, resp)
	token, _ := registerData["accessToken"].(string)
	if token == "" {
		t.Fatalf("expected access token in register response")
	}

	req, _ := http.NewRequest(http.MethodGet, server.URL+"/users/search?q=user", nil)
	respProtected, err := server.Client().Do(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if respProtected.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", respProtected.StatusCode)
	}
	_ = respProtected.Body.Close()

	reqAuthed, _ := http.NewRequest(http.MethodGet, server.URL+"/users/search?q=user", nil)
	reqAuthed.Header.Set("Authorization", "Bearer "+token)
	respAuthed, err := server.Client().Do(reqAuthed)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	if respAuthed.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 with token, got %d", respAuthed.StatusCode)
	}
	_ = respAuthed.Body.Close()
}

func TestIntegrationUpdateUserForbidsCrossUser(t *testing.T) {
	server, db := setupIntegrationServer(t)
	resetDB(t, db)

	respA := postJSON(t, server.Client(), server.URL+"/auth/register", map[string]any{
		"email":    "usera@example.com",
		"password": "secret-123",
	}, "")
	dataA := readJSONBody(t, respA)
	tokenA, _ := dataA["accessToken"].(string)
	userA, _ := dataA["user"].(map[string]any)
	userAID, _ := userA["id"].(string)

	respB := postJSON(t, server.Client(), server.URL+"/auth/register", map[string]any{
		"email":    "userb@example.com",
		"password": "secret-123",
	}, "")
	dataB := readJSONBody(t, respB)
	userB, _ := dataB["user"].(map[string]any)
	userBID, _ := userB["id"].(string)

	respForbidden := putJSON(t, server.Client(), server.URL+"/users/"+userBID, map[string]any{
		"displayName": "hacked",
	}, tokenA)
	if respForbidden.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 on cross-user update, got %d", respForbidden.StatusCode)
	}
	_ = respForbidden.Body.Close()

	respSelf := putJSON(t, server.Client(), server.URL+"/users/"+userAID, map[string]any{
		"displayName": "updated-self",
	}, tokenA)
	if respSelf.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on self update, got %d", respSelf.StatusCode)
	}
	selfData := readJSONBody(t, respSelf)
	displayName, _ := selfData["displayName"].(string)
	if displayName != "updated-self" {
		t.Fatalf("expected updated displayName, got %q", displayName)
	}
}
