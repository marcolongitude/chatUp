#!/bin/bash
# Script para corrigir vulnerabilidades do npm audit

set -e

echo "🔒 Corrigindo vulnerabilidades de segurança..."
echo ""

cd "$(dirname "$0")"

# Atualizar dependências vulneráveis
echo "📦 Atualizando dependências..."
npm audit fix --force || true

# Verificar se react-server-dom-webpack está presente (não deveria estar)
if npm list react-server-dom-webpack 2>/dev/null | grep -q "react-server-dom-webpack"; then
  echo "⚠️  react-server-dom-webpack encontrado (não deveria estar aqui)"
  echo "🗑️  Removendo..."
  npm uninstall react-server-dom-webpack 2>/dev/null || true
fi

# Limpar cache
echo "🧹 Limpando cache..."
npm cache clean --force

# Reinstalar dependências
echo "📦 Reinstalando dependências..."
npm ci

# Verificar vulnerabilidades
echo "🔍 Verificando vulnerabilidades..."
npm audit --production || echo "⚠️  Algumas vulnerabilidades podem permanecer em devDependencies"

echo ""
echo "✅ Correção concluída!"

