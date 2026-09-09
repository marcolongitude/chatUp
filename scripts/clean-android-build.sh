#!/bin/bash
# Script para limpar completamente o build Android e caches do Gradle

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Limpando build Android e caches do Gradle..."
echo ""

cd "$PROJECT_ROOT"

# Limpar diretórios de build locais
if [ -d "android" ]; then
  echo "📁 Limpando diretórios de build locais..."
  cd android
  rm -rf .gradle
  rm -rf app/.cxx
  rm -rf app/build
  rm -rf build
  rm -rf .idea
  echo "✅ Diretórios locais limpos"
  cd ..
else
  echo "⚠️  Diretório android não encontrado"
fi

# Limpar cache do Gradle global (react-android)
echo "📦 Limpando cache do Gradle global (react-android)..."
rm -rf ~/.gradle/caches/transforms/*/react-android* 2>/dev/null || true
echo "✅ Cache do react-android removido"

# Limpar cache groovy-dsl corrompido
echo "📦 Limpando cache groovy-dsl corrompido..."
rm -rf ~/.gradle/caches/*/groovy-dsl 2>/dev/null || true
echo "✅ Cache groovy-dsl removido"

# Parar daemon do Gradle e limpar cache
echo "🛑 Parando daemon do Gradle..."
rm -rf ~/.gradle/daemon 2>/dev/null || true
echo "✅ Daemon do Gradle parado"

# Limpar cache do Gradle daemon (opcional, mais agressivo)
if [ "$1" == "--full" ]; then
  echo "🗑️  Limpeza completa: removendo todo o cache do Gradle..."
  rm -rf ~/.gradle/caches/* 2>/dev/null || true
  echo "✅ Cache completo do Gradle removido"
fi

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "🚀 Agora você pode executar:"
echo "   cd android && ./gradlew clean"
echo "   ou"
echo "   npm run build:android:apk"
echo ""

