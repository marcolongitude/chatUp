package middleware

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"go.opentelemetry.io/otel/trace"
)

type logStatusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *logStatusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func RequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			started := time.Now()
			rec := &logStatusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)

			requestID := chimw.GetReqID(r.Context())
			userID := "anonymous"
			if ctxUserID, ok := r.Context().Value(UserIDKey).(string); ok && ctxUserID != "" {
				userID = ctxUserID
			} else if headerUserID := r.Header.Get("X-Internal-UserID"); headerUserID != "" {
				userID = headerUserID
			}

			logger.Info("http_request",
				"request_id", requestID,
				"trace_id", trace.SpanContextFromContext(r.Context()).TraceID().String(),
				"user_id", userID,
				"method", r.Method,
				"route", r.URL.Path,
				"status_code", rec.status,
				"status", strconv.Itoa(rec.status),
				"duration_ms", time.Since(started).Milliseconds(),
			)
		})
	}
}
