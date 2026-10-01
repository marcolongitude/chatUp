#!/bin/bash
# Script para iniciar todo o ambiente de testes de uma vez

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
MOBILE_DIR="$PROJECT_ROOT/mobile"

echo "🚀 Iniciando ambiente de testes..."
echo ""

# Verificar se o .env existe
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "⚠️  Arquivo .env não encontrado. Configurando..."
  cd "$PROJECT_ROOT" && ./scripts/setup-test-env.sh
  echo ""
fi

# Carregar variáveis
source "$PROJECT_ROOT/.env"

# Obter IP local
LOCAL_IP=$(cd "$PROJECT_ROOT" && ./scripts/get-local-ip.sh)

echo "📡 IP Local: $LOCAL_IP"
echo ""

# Iniciar Docker Compose
echo "🐳 Iniciando Docker Compose (postgres + backend-go)..."
cd "$DEPLOY_DIR"
if docker compose ps | grep -q "Up"; then
  echo "✅ Docker Compose já está rodando"
else
  docker compose up -d
  echo "⏳ Aguardando serviços iniciarem..."
  sleep 5
fi

echo ""
echo "✅ Ambiente de testes configurado!"
echo ""
echo "📋 Informações:"
echo "   - Backend: http://$LOCAL_IP:3000"
echo "   - Health Check: http://$LOCAL_IP:3000/health"
echo ""
echo "🚀 Compose (API Go + Postgres):"
echo "   cd deploy && docker compose up -d"
echo ""
echo "📱 App Expo:"
echo "   cd mobile && npm start"
echo ""
