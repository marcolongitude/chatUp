#!/usr/bin/env bash
# Sobe Postgres + backend-go locais para a suíte de família.
# A API pública de staging não é o código sob teste e pode estar inacessível.
# Pensado para ser sourced por scripts/test-guardrails.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="${CHATUP_E2E_POSTGRES_CONTAINER:-chatup-guardrail-postgres}"
PG_PORT="${CHATUP_GUARDRAIL_PG_PORT:-5433}"
API_PORT="${CHATUP_GUARDRAIL_API_PORT:-3000}"
API_URL="http://127.0.0.1:${API_PORT}"
PG_IMAGE="${CHATUP_GUARDRAIL_PG_IMAGE:-postgres:16-alpine}"
PID_FILE="/tmp/chatup-guardrail-api.pid"
LOG_FILE="/tmp/chatup-guardrail-api.log"
DB_URL="postgres://admin:password@127.0.0.1:${PG_PORT}/chatup?sslmode=disable"

export CHATUP_E2E_API_URL="$API_URL"
export CHATUP_E2E_POSTGRES_CONTAINER="$CONTAINER"
export CHATUP_E2E_AUTO_PAIR=0

stop_api() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${pid}" ]]; then
    kill -- "-${pid}" 2>/dev/null || kill "${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
}

start_postgres() {
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    return
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    docker start "$CONTAINER" >/dev/null
    return
  fi
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_DB=chatup \
    -e POSTGRES_USER=admin \
    -e POSTGRES_PASSWORD=password \
    -p "${PG_PORT}:5432" \
    "$PG_IMAGE" >/dev/null
}

wait_pg() {
  local i
  for i in $(seq 1 40); do
    if docker exec "$CONTAINER" pg_isready -U admin -d chatup >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "postgres do guardrail nao ficou pronto" >&2
  return 1
}

apply_migrations() {
  local f name has_postgis
  docker exec -i "$CONTAINER" psql -U admin -d chatup -v ON_ERROR_STOP=1 -c \
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY);" >/dev/null
  has_postgis="$(docker exec "$CONTAINER" psql -U admin -d chatup -tAc \
    "SELECT 1 FROM pg_available_extensions WHERE name='postgis'" || true)"
  for f in "$ROOT"/backend-go/db/migrations/*.sql; do
    name="$(basename "$f")"
    if [[ "$name" == "0004_postgis_nearby.sql" && "$has_postgis" != "1" ]]; then
      continue
    fi
    if docker exec "$CONTAINER" psql -U admin -d chatup -tAc \
      "SELECT 1 FROM schema_migrations WHERE name='${name}'" | grep -q 1; then
      continue
    fi
    docker exec -i "$CONTAINER" psql -U admin -d chatup -v ON_ERROR_STOP=1 <"$f"
    docker exec "$CONTAINER" psql -U admin -d chatup -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migrations(name) VALUES ('${name}')" >/dev/null
  done
}

api_healthy() {
  curl -sf --max-time 2 "${API_URL}/health" | grep -q 'chatup-backend-go'
}

start_api() {
  stop_api
  (
    cd "$ROOT/backend-go"
    export DATABASE_URL="$DB_URL"
    export JWT_SECRET="${JWT_SECRET:-dev-secret-key}"
    export PORT="$API_PORT"
    export JWT_ACCESS_TTL=30
    export JWT_TTL=30
    export JWT_REFRESH_TTL_DAYS=30
    export FAMILY_GRACE_SECONDS=1800
    export LOCATION_STALE_SECONDS=900
    export OTEL_EXPORTER_OTLP_ENDPOINT=127.0.0.1:4317
    export CORS_ORIGIN='*'
    exec setsid go run ./cmd/api
  ) >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  local i
  for i in $(seq 1 90); do
    if api_healthy; then
      return 0
    fi
    if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "api do guardrail encerrou; log:" >&2
      tail -n 50 "$LOG_FILE" >&2 || true
      return 1
    fi
    sleep 1
  done
  echo "api do guardrail nao respondeu /health; log:" >&2
  tail -n 50 "$LOG_FILE" >&2 || true
  return 1
}

seed_account() {
  local email="$1" password="$2" name="$3" code login
  code="$(curl -s -o /tmp/chatup-guardrail-reg.json -w '%{http_code}' --max-time 15 \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"displayName\":\"${name}\"}" \
    "${API_URL}/auth/register" || true)"
  if [[ "$code" != "201" && "$code" != "409" ]]; then
    echo "falha ao registrar ${email} (HTTP ${code})" >&2
    cat /tmp/chatup-guardrail-reg.json >&2 || true
    return 1
  fi
  login="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    "${API_URL}/auth/login" || true)"
  if [[ "$login" != "200" ]]; then
    echo "falha no login de ${email} (HTTP ${login})" >&2
    return 1
  fi
}

start_postgres
wait_pg
apply_migrations
start_api
seed_account "e2e-device-a@chatup.test" "E2eTest123!" "E2E Device A"
seed_account "e2e-peer-b@chatup.test" "E2eTest123!" "E2E Peer B"
echo "guardrail api ${API_URL} (postgres ${CONTAINER}:${PG_PORT})"
