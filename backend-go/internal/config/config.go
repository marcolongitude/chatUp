package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	JWTTTLMinutes        int // access token TTL
	JWTRefreshTTLDays    int // refresh token TTL
	GoogleClientID       string
	UploadDir            string
	CORSOrigin           string
	OTLPEndpoint         string
	ServiceName          string
}

func Load() Config {
	_ = godotenv.Load()
	// Access JWT: short-lived (default 30m). Staging historically used JWT_TTL=1440;
	// prefer JWT_ACCESS_TTL when set, else JWT_TTL, else 30.
	accessTTL, _ := strconv.Atoi(getEnv("JWT_ACCESS_TTL", ""))
	if accessTTL <= 0 {
		accessTTL, _ = strconv.Atoi(getEnv("JWT_TTL", "30"))
	}
	if accessTTL <= 0 {
		accessTTL = 30
	}
	refreshDays, _ := strconv.Atoi(getEnv("JWT_REFRESH_TTL_DAYS", "30"))
	if refreshDays <= 0 {
		refreshDays = 30
	}
	return Config{
		Port:              getEnv("PORT", "3000"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://admin:password@localhost:5432/chatup?sslmode=disable"),
		JWTSecret:         getEnv("JWT_SECRET", "SECRET_KEY_DEV"),
		JWTTTLMinutes:     accessTTL,
		JWTRefreshTTLDays: refreshDays,
		GoogleClientID:    getEnv("GOOGLE_CLIENT_ID", ""),
		UploadDir:         getEnv("UPLOAD_DIR", "./uploads"),
		CORSOrigin:        getEnv("CORS_ORIGIN", "*"),
		OTLPEndpoint:      getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "alloy.observability.svc.cluster.local:4317"),
		ServiceName:       getEnv("OTEL_SERVICE_NAME", "chatup-backend-go"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
