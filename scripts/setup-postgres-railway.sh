#!/bin/bash
# 🐘 Setup PostgreSQL no Railway

set +e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "🐘 Setup PostgreSQL no Railway"
echo "=============================="
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar se postgres existe
SERVICES=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4)
HAS_POSTGRES=$(echo "$SERVICES" | grep -q "^postgres$" && echo "yes" || echo "no")

if [ "$HAS_POSTGRES" = "yes" ]; then
    print_success "Serviço 'postgres' já existe!"
    railway service link postgres 2>&1 > /dev/null
else
    print_warning "Serviço 'postgres' não existe"
    echo ""
    print_info "Execute: ${BLUE}railway add --database postgres --service postgres${NC}"
    echo "Quando perguntar, digite: ${GREEN}Database${NC}"
    echo ""
    read -p "Pressione ENTER após criar o serviço: " -r
fi

# Fazer deploy
print_info "Fazendo deploy com Dockerfile customizado..."

# Backup e configurar
[ -f "railway.json" ] && cp railway.json railway.json.bak
[ -f "Dockerfile" ] && cp Dockerfile Dockerfile.bak

cp railway.postgres.json railway.json 2>/dev/null || true
cp Dockerfile.postgres Dockerfile 2>/dev/null || true

railway up --service postgres --detach 2>&1 | head -20

# Restaurar
[ -f "railway.json.bak" ] && mv railway.json.bak railway.json
[ -f "Dockerfile.bak" ] && mv Dockerfile.bak Dockerfile

print_success "Deploy concluído!"
