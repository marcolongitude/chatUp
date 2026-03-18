#!/bin/bash
# Script para verificar se o ambiente de testes está configurado corretamente

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Verificando ambiente de testes..."
echo ""

# Verificar se o .env existe
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo .env não encontrado!"
  echo "   Execute: ./scripts/setup-test-env.sh"
  exit 1
fi

# Carregar variáveis do .env
source "$ENV_FILE"

# Verificar IP local
LOCAL_IP=$(cd "$PROJECT_ROOT" && ./scripts/get-local-ip.sh)
echo "📡 IP Local detectado: $LOCAL_IP"

if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "192.168.0.18" ]; then
  echo "⚠️  Usando IP padrão. Verifique se está correto."
fi

echo ""
echo "🔌 Verificando serviços..."

# Verificar se o backend está rodando
if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1 || curl -s -f "http://$LOCAL_IP:3000/health" > /dev/null 2>&1; then
  echo "✅ Backend está rodando na porta 3000"
else
  echo "❌ Backend não está respondendo na porta 3000"
  echo "   Execute: cd backend && npm run start:dev"
fi

# Verificar se o PostgreSQL está rodando
if docker ps | grep -q chatup_postgres; then
  echo "✅ PostgreSQL está rodando"
else
  echo "❌ PostgreSQL não está rodando"
  echo "   Execute: cd backend && docker compose up -d"
fi

# Verificar se o Electric SQL está rodando
if docker ps | grep -q chatup_electric; then
  echo "✅ Electric SQL está rodando"
else
  echo "❌ Electric SQL não está rodando"
  echo "   Execute: cd backend && docker compose up -d"
fi

# Verificar se o Electric está respondendo
if curl -s -f "http://localhost:5133" > /dev/null 2>&1 || curl -s -f "http://$LOCAL_IP:5133" > /dev/null 2>&1; then
  echo "✅ Electric SQL está respondendo na porta 5133"
else
  echo "⚠️  Electric SQL não está respondendo na porta 5133"
  echo "   Verifique se o container está rodando corretamente"
fi

echo ""
echo "🌐 Configurações de rede:"
echo "   - API URL: ${EXPO_PUBLIC_API_URL:-http://$LOCAL_IP:3000}"
echo "   - Electric WebSocket: ${EXPO_PUBLIC_ELECTRIC_URL:-ws://$LOCAL_IP:5133}"
echo "   - Electric HTTP: ${EXPO_PUBLIC_ELECTRIC_API_URL:-http://$LOCAL_IP:5133}"
echo ""
echo "📱 Para testar em dispositivo físico:"
echo "   1. Certifique-se de que o dispositivo está na mesma rede WiFi"
echo "   2. Use o IP acima nas configurações do app"
echo "   3. Verifique o firewall: sudo ufw allow 3000/tcp && sudo ufw allow 5133/tcp"
echo ""

