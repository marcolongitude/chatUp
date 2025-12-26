#!/bin/bash
# Script para configurar ambiente de testes em dispositivos físicos
# Detecta o IP local e configura as variáveis de ambiente

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Configurando ambiente de testes para dispositivos físicos..."
echo ""

# Detectar IP local
echo "📡 Detectando IP local da máquina..."
LOCAL_IP=$(cd "$PROJECT_ROOT" && ./scripts/get-local-ip.sh)

if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "192.168.0.14" ]; then
  echo "⚠️  Não foi possível detectar o IP automaticamente."
  echo "   Usando IP padrão: 192.168.0.14"
  echo "   Se este não for o IP correto, edite o arquivo .env manualmente"
  LOCAL_IP="192.168.0.14"
else
  echo "✅ IP detectado: $LOCAL_IP"
fi

echo ""
echo "📝 Configurando variáveis de ambiente..."

# Criar ou atualizar arquivo .env
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "📄 Criando arquivo .env..."
  touch "$ENV_FILE"
fi

# Atualizar ou adicionar variáveis
if grep -q "^LOCAL_IP=" "$ENV_FILE"; then
  sed -i "s|^LOCAL_IP=.*|LOCAL_IP=$LOCAL_IP|" "$ENV_FILE"
else
  echo "LOCAL_IP=$LOCAL_IP" >> "$ENV_FILE"
fi

if grep -q "^EXPO_PUBLIC_API_URL=" "$ENV_FILE"; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3000|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3000" >> "$ENV_FILE"
fi

if grep -q "^EXPO_PUBLIC_ELECTRIC_URL=" "$ENV_FILE"; then
  sed -i "s|^EXPO_PUBLIC_ELECTRIC_URL=.*|EXPO_PUBLIC_ELECTRIC_URL=ws://$LOCAL_IP:5133|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_ELECTRIC_URL=ws://$LOCAL_IP:5133" >> "$ENV_FILE"
fi

if grep -q "^EXPO_PUBLIC_ELECTRIC_API_URL=" "$ENV_FILE"; then
  sed -i "s|^EXPO_PUBLIC_ELECTRIC_API_URL=.*|EXPO_PUBLIC_ELECTRIC_API_URL=http://$LOCAL_IP:5133|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_ELECTRIC_API_URL=http://$LOCAL_IP:5133" >> "$ENV_FILE"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Resumo da configuração:"
echo "   - IP Local: $LOCAL_IP"
echo "   - API URL: http://$LOCAL_IP:3000"
echo "   - Electric WebSocket: ws://$LOCAL_IP:5133"
echo "   - Electric HTTP: http://$LOCAL_IP:5133"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Certifique-se de que o backend está rodando:"
echo "      cd backend && npm run start:dev"
echo ""
echo "   2. Certifique-se de que o Docker Compose está rodando:"
echo "      cd backend && docker compose up -d"
echo ""
echo "   3. Verifique se o firewall permite conexões nas portas 3000 e 5133:"
echo "      sudo ufw allow 3000/tcp"
echo "      sudo ufw allow 5133/tcp"
echo ""
echo "   4. No dispositivo físico, certifique-se de estar na mesma rede WiFi"
echo ""
echo "   5. Gere o APK com as configurações:"
echo "      npm run android"
echo "      ou"
echo "      eas build --platform android --profile production"
echo ""

