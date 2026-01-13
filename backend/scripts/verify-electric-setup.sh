#!/bin/bash

# Script para verificar se Electric SQL está configurado corretamente
# Execute este script após fazer deploy no Railway

echo "🔍 Verificando configuração do Electric SQL..."
echo ""

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não está configurada"
  exit 1
else
  echo "✅ DATABASE_URL configurada"
fi

# Verificar se PostgreSQL tem logical replication habilitado
echo ""
echo "📋 Verificando configuração do PostgreSQL..."
echo "Execute no PostgreSQL do Railway:"
echo ""
echo "railway connect --service postgres"
echo ""
echo "Depois execute:"
echo "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');"
echo ""
echo "wal_level deve ser 'logical'"
echo "max_replication_slots deve ser >= 10"
echo "max_wal_senders deve ser >= 10"
echo ""

# Verificar se publicação existe
echo "📋 Verificando publicação do Electric SQL..."
echo "Execute no PostgreSQL:"
echo "SELECT * FROM pg_publication WHERE pubname = 'electric_publication';"
echo ""
echo "Se não existir, execute:"
echo "CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;"
echo ""

# Verificar se Electric SQL está rodando
echo "📋 Verificando se Electric SQL está rodando..."
echo "Teste o endpoint:"
echo "curl http://localhost:5133/health"
echo ""
echo "Ou via Railway:"
echo "railway connect --service backend"
echo "curl http://localhost:5133/health"
echo ""

echo "✅ Verificação completa!"
