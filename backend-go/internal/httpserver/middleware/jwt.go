package middleware

import (
	"context"
	"net/http"
	"strings"

	"chatup/backend-go/internal/security"
)

type ctxKey string

const UserIDKey ctxKey = "userID"

func JWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if !strings.HasPrefix(auth, "Bearer ") {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			token := strings.TrimPrefix(auth, "Bearer ")
			claims, err := security.ParseToken(secret, token)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserIDKey, claims.Sub)
			r.Header.Set("X-Internal-UserID", claims.Sub)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
