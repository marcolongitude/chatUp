#!/bin/bash
# ⚡ Deploy Electric SQL

cd "$(dirname "$0")/../backend" || exit 1

echo "⚡ Deploy Electric SQL"
echo "======================"
echo ""

# Verificar serviço
SERVICES=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4)
ELECTRIC=$(echo "$SERVICES" | grep -i electric | head -1)

if [ -z "$ELECTRIC" ]; then
    echo "❌ Serviço Electric não encontrado!"
    echo ""
    echo "Crie primeiro via Dashboard:"
    echo "  1. railway.app → terrific-balance → + New → GitHub Repo"
    echo "  2. Service Name: electric-sql"
    echo "  3. Root Directory: backend"
    exit 1
fi

echo "✅ Serviço encontrado: $ELECTRIC"
railway service link "$ELECTRIC" 2>&1 > /dev/null

# Backup
[ -f "railway.json" ] && cp railway.json railway.json.bak
[ -f "Dockerfile" ] && cp Dockerfile Dockerfile.bak 2>/dev/null || true

# Configurar
cp railway.electric.json railway.json
cp Dockerfile.electric Dockerfile

echo "🚀 Fazendo deploy..."
railway up --service "$ELECTRIC" --detach 2>&1 | head -20

# Restaurar
[ -f "railway.json.bak" ] && mv railway.json.bak railway.json
[ -f "Dockerfile.bak" ] && mv Dockerfile.bak Dockerfile || rm -f Dockerfile

echo ""
echo "✅ Deploy iniciado!"
echo ""
echo "Ver logs: railway logs --service $ELECTRIC --follow"
