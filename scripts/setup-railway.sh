#!/bin/bash
# Script para configurar deploy no Railway rapidamente

set -e

echo "🚀 Configurando deploy no Railway..."
echo ""

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
  echo "📦 Instalando Railway CLI..."
  curl -fsSL https://railway.app/install.sh | sh
  echo "✅ Railway CLI instalado"
  echo ""
fi

echo "📝 Passos para configurar:"
echo ""
echo "1. Faça login no Railway:"
echo "   railway login"
echo ""
echo "2. Crie um novo projeto:"
echo "   cd backend"
echo "   railway init"
echo ""
echo "3. Adicione PostgreSQL:"
echo "   railway add postgresql"
echo ""
echo "4. Configure variáveis de ambiente:"
echo "   railway variables set NODE_ENV=production"
echo "   railway variables set PORT=3000"
echo ""
echo "5. Faça deploy:"
echo "   railway up"
echo ""
echo "6. Obtenha a URL do serviço:"
echo "   railway domain"
echo ""
echo "📋 Após obter a URL, atualize o eas.json e app.config.js com:"
echo "   EXPO_PUBLIC_API_URL=https://seu-backend.railway.app"
echo ""
echo "✅ Configuração concluída!"

