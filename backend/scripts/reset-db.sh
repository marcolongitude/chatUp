#!/bin/bash
# Script para resetar o banco de dados PostgreSQL
# Uso: ./scripts/reset-db.sh

echo "⚠️  ATENÇÃO: Isso vai apagar TODOS os dados do banco!"
echo "Pressione Ctrl+C para cancelar ou Enter para continuar..."
read

# Configurações do banco
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USERNAME:-admin}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-chatup}"

echo "🔄 Resetando banco de dados..."

# Executar comandos SQL de reset
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public; COMMENT ON SCHEMA public IS 'standard public schema';"

if [ $? -eq 0 ]; then
    echo "✅ Banco de dados resetado com sucesso!"
    echo "💡 Agora você pode executar 'npm run start:dev' para recriar as tabelas com o schema correto"
else
    echo "❌ Erro ao resetar banco de dados"
    exit 1
fi

