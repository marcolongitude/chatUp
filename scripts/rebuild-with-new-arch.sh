#!/bin/bash

# Script para reconstruir o app Android com Nova Arquitetura (TurboModules) habilitada
# Este script limpa todos os caches e reconstrói o projeto do zero

set -e

echo "🔧 Iniciando rebuild completo com Nova Arquitetura..."

# 1. Limpar cache do Metro
echo "📦 Limpando cache do Metro..."
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear || true

# 2. Limpar build Android
echo "🧹 Limpando build Android..."
cd android
./gradlew clean || true
rm -rf .gradle
rm -rf app/build
rm -rf build
cd ..

# 3. Limpar node_modules e reinstalar (opcional, descomente se necessário)
# echo "📦 Reinstalando dependências..."
# rm -rf node_modules
# npm install

# 4. Verificar configurações
echo "✅ Verificando configurações..."
echo "  - app.config.js: newArchEnabled=$(grep -A 1 'newArchEnabled' app.config.js | grep -o 'true\|false')"
echo "  - android/gradle.properties: newArchEnabled=$(grep '^newArchEnabled' android/gradle.properties | cut -d'=' -f2)"

# 5. Reconstruir Android
echo "🔨 Reconstruindo Android com Nova Arquitetura..."
cd android
./gradlew clean
./gradlew assembleDebug
cd ..

echo "✅ Rebuild completo! Agora execute: npm run android"
