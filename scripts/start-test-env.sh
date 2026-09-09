#!/bin/bash
# Script para iniciar todo o ambiente de testes de uma vez

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
echo "🐳 Iniciando Docker Compose (serviços backend)..."
cd "$PROJECT_ROOT/backend"
if docker compose ps | grep -q "chatup_postgres.*Up"; then
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
echo "🚀 Para iniciar o backend, execute em outro terminal:"
echo "   cd backend && npm run start:dev"
echo ""
echo "📱 Para gerar o APK:"
echo "   npm run build:android:dev"
echo ""

