#!/bin/bash

# 🐘 Criar Serviço PostgreSQL no Railway - Método Simplificado
# Usa template do Railway e depois configura Dockerfile customizado

set +e  # Não parar em erros

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🐘 Criando Serviço PostgreSQL no Railway"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar se já existe
EXISTING=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep -q "^postgres$" && echo "yes" || echo "no")

if [ "$EXISTING" = "yes" ]; then
    print_warning "Serviço 'postgres' já existe!"
    print_info "Linkando ao serviço existente..."
    railway service link postgres 2>&1
    print_success "Linkado ao serviço postgres"
    exit 0
fi

print_info "Criando serviço PostgreSQL..."
echo ""
print_warning "O Railway CLI requer interação para criar databases"
echo ""
print_info "Execute manualmente o seguinte comando:"
echo ""
echo "  ${BLUE}cd backend${NC}"
echo "  ${BLUE}railway add --database postgres --service postgres${NC}"
echo ""
echo "Quando solicitado 'What do you need?', digite: ${GREEN}Database${NC}"
echo ""
print_info "OU use o método alternativo abaixo:"
echo ""
echo "  ${BLUE}railway add --database postgres${NC}"
echo "  ${BLUE}railway service link <nome-do-servico-criado>${NC}"
echo "  ${BLUE}railway service rename <nome> postgres${NC}"
echo ""

# Tentar criar automaticamente (pode não funcionar)
print_info "Tentando criar automaticamente..."
echo "Database" | railway add --database postgres --service postgres 2>&1 | head -10

# Verificar se foi criado
sleep 2
NEW_SERVICE=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep postgres | head -1)

if [ -n "$NEW_SERVICE" ]; then
    print_success "Serviço criado: $NEW_SERVICE"
    
    # Renomear se necessário
    if [ "$NEW_SERVICE" != "postgres" ]; then
        print_info "Renomeando serviço para 'postgres'..."
        # Railway CLI não tem comando de rename, precisa ser feito no dashboard
        print_warning "Renomeie manualmente no Dashboard ou use: railway service link $NEW_SERVICE"
    fi
else
    print_warning "Não foi possível criar automaticamente"
    print_info "Execute o comando manualmente (veja instruções acima)"
fi
