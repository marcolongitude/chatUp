APP=chatup-backend-go

.PHONY: run test lint sqlc-gen migrate-up migrate-down tidy

run:
	go run ./cmd/api

test:
	go test ./...

lint:
	go vet ./...

sqlc-gen:
	sqlc generate -f db/sqlc.yaml

migrate-up:
	@echo "Use your preferred migration runner for db/migrations"

migrate-down:
	@echo "Add down migrations as needed"

tidy:
	go mod tidy
