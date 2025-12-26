#!/bin/bash
# Script para corrigir conflito de namespace após remover react-native-random-uuid

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Corrigindo conflito de namespace..."
echo ""

cd "$PROJECT_ROOT"

# Remover node_modules e reinstalar
echo "📦 Removendo node_modules e reinstalando dependências..."
rm -rf node_modules
npm install

# Limpar cache do Gradle
echo "🧹 Limpando cache do Gradle..."
cd android
./gradlew clean
cd ..

# Limpar cache do Metro
echo "🧹 Limpando cache do Metro..."
rm -rf .expo
rm -rf android/app/build
rm -rf android/build

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "🚀 Agora você pode tentar gerar o APK novamente:"
echo "   npm run build:android:dev"
echo ""

