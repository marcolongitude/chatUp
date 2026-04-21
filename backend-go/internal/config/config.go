package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTTTLMinutes  int
	GoogleClientID string
	UploadDir      string
	CORSOrigin     string
}

func Load() Config {
	_ = godotenv.Load()
	ttl, _ := strconv.Atoi(getEnv("JWT_TTL", "60"))
	return Config{
		Port:           getEnv("PORT", "3000"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://admin:password@localhost:5432/chatup?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", "SECRET_KEY_DEV"),
		JWTTTLMinutes:  ttl,
		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
		UploadDir:      getEnv("UPLOAD_DIR", "./uploads"),
		CORSOrigin:     getEnv("CORS_ORIGIN", "*"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
