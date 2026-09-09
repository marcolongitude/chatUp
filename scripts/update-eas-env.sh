#!/bin/bash
# Script para atualizar as variáveis de ambiente no eas.json com o IP local

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Atualizando variáveis de ambiente no eas.json..."
echo ""

# Detectar IP local
LOCAL_IP=$(cd "$PROJECT_ROOT" && ./scripts/get-local-ip.sh)

if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "192.168.0.18" ]; then
  echo "⚠️  Não foi possível detectar o IP automaticamente."
  echo "   Usando IP padrão: 192.168.0.18"
  LOCAL_IP="192.168.0.18"
else
  echo "✅ IP detectado: $LOCAL_IP"
fi

echo ""
echo "📝 Atualizando eas.json..."

# Atualizar eas.json usando Node.js para manipular JSON de forma segura
cd "$PROJECT_ROOT"
node <<EOF
const fs = require('fs');
const path = require('path');

const easJsonPath = path.join(__dirname, 'eas.json');
const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

const localIp = '${LOCAL_IP}';
const apiUrl = \`http://\${localIp}:3000\`;
// Atualizar preview
if (easJson.build.preview.env) {
  easJson.build.preview.env.EXPO_PUBLIC_API_URL = apiUrl;
}

// Atualizar production
if (easJson.build.production.env) {
  easJson.build.production.env.EXPO_PUBLIC_API_URL = apiUrl;
}

// Atualizar production-aab
if (easJson.build['production-aab'].env) {
  easJson.build['production-aab'].env.EXPO_PUBLIC_API_URL = apiUrl;
}

fs.writeFileSync(easJsonPath, JSON.stringify(easJson, null, 4) + '\n');
console.log('✅ eas.json atualizado com sucesso!');
EOF

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 URLs configuradas:"
echo "   - API URL: http://$LOCAL_IP:3000"
echo ""
echo "🚀 Agora você pode gerar o APK:"
echo "   npm run build:android:apk"
echo ""

