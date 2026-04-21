#!/bin/bash

# 🔧 Fix: Configurar DATABASE_URL no Railway

set +e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🔧 Configurar DATABASE_URL no Railway"
echo "======================================"
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    exit 1
fi

# Verificar serviços
print_info "Verificando serviços..."
SERVICES_JSON=$(railway status --json 2>&1)
POSTGRES_SERVICE=$(echo "$SERVICES_JSON" | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep -iE "postgres" | head -1)
BACKEND_SERVICE=$(echo "$SERVICES_JSON" | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep -iE "backend|chatup" | head -1)

if [ -z "$POSTGRES_SERVICE" ]; then
    print_error "Serviço PostgreSQL não encontrado!"
    print_info "Crie um serviço PostgreSQL primeiro"
    exit 1
fi

if [ -z "$BACKEND_SERVICE" ]; then
    print_error "Serviço Backend não encontrado!"
    print_info "Crie um serviço backend primeiro"
    exit 1
fi

print_success "PostgreSQL: $POSTGRES_SERVICE"
print_success "Backend: $BACKEND_SERVICE"
echo ""

# Linkar ao backend
railway service link "$BACKEND_SERVICE" 2>&1 > /dev/null

# Verificar variáveis atuais
print_info "Verificando variáveis atuais..."
CURRENT_DB_URL=$(railway variables --json 2>&1 | grep -o '"DATABASE_URL": "[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$CURRENT_DB_URL" ]; then
    print_warning "DATABASE_URL já existe: $CURRENT_DB_URL"
    read -p "Deseja atualizar? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Mantendo variável atual"
        exit 0
    fi
fi

# Configurar DATABASE_URL
print_info "Configurando DATABASE_URL..."
DB_URL_VALUE="\${{$POSTGRES_SERVICE.DATABASE_URL}}"

railway variables set "DATABASE_URL=$DB_URL_VALUE" 2>&1 | head -10

# Verificar outras variáveis necessárias
print_info "Verificando outras variáveis..."

railway variables set NODE_ENV=production 2>&1 > /dev/null
railway variables set PORT=3000 2>&1 > /dev/null

print_success "Variáveis configuradas!"
echo ""
print_info "DATABASE_URL=$DB_URL_VALUE"
print_info "NODE_ENV=production"
print_info "PORT=3000"
echo ""

# Verificar se precisa de JWT_SECRET
JWT_SECRET=$(railway variables --json 2>&1 | grep -o '"JWT_SECRET": "[^"]*"' | cut -d'"' -f4 || echo "")
if [ -z "$JWT_SECRET" ]; then
    print_warning "JWT_SECRET não configurado!"
    print_info "Configure manualmente:"
    echo "  railway variables set JWT_SECRET=\$(openssl rand -base64 32) --service $BACKEND_SERVICE"
fi

print_success "Configuração completa!"
echo ""
print_info "Faça deploy: ${BLUE}railway up --service $BACKEND_SERVICE --detach${NC}"
