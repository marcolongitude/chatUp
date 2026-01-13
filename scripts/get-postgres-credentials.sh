#!/bin/bash

# 🔐 Obter Credenciais do PostgreSQL no Railway

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

echo "🔐 Obter Credenciais PostgreSQL Railway"
echo "========================================"
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    exit 1
fi

# Encontrar serviço PostgreSQL
print_info "Procurando serviço PostgreSQL..."
SERVICES_JSON=$(railway status --json 2>&1)
POSTGRES_SERVICE=$(echo "$SERVICES_JSON" | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep -iE "postgres" | head -1)

if [ -z "$POSTGRES_SERVICE" ]; then
    print_error "Serviço PostgreSQL não encontrado!"
    print_info "Verifique no Dashboard: railway.app"
    exit 1
fi

print_success "Serviço PostgreSQL: $POSTGRES_SERVICE"
echo ""

# Linkar ao serviço PostgreSQL
railway service link "$POSTGRES_SERVICE" 2>&1 > /dev/null

# Obter variáveis
print_info "Obtendo credenciais..."
DATABASE_URL=$(railway variables --json 2>&1 | grep -o '"DATABASE_URL": "[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL não encontrada!"
    print_info "Tentando obter variáveis individuais..."
    
    PGHOST=$(railway variables --json 2>&1 | grep -o '"PGHOST": "[^"]*"' | cut -d'"' -f4 || echo "")
    PGPORT=$(railway variables --json 2>&1 | grep -o '"PGPORT": "[^"]*"' | cut -d'"' -f4 || echo "")
    PGUSER=$(railway variables --json 2>&1 | grep -o '"PGUSER": "[^"]*"' | cut -d'"' -f4 || echo "")
    PGPASSWORD=$(railway variables --json 2>&1 | grep -o '"PGPASSWORD": "[^"]*"' | cut -d'"' -f4 || echo "")
    PGDATABASE=$(railway variables --json 2>&1 | grep -o '"PGDATABASE": "[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$PGHOST" ]; then
        echo ""
        print_success "Credenciais encontradas:"
        echo ""
        echo "  Host:     $PGHOST"
        echo "  Port:     $PGPORT"
        echo "  User:     $PGUSER"
        echo "  Password: $PGPASSWORD"
        echo "  Database: $PGDATABASE"
        echo ""
        echo "String de conexão:"
        echo "  postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
    else
        print_error "Não foi possível obter credenciais automaticamente"
        print_info "Acesse o Dashboard: railway.app → $POSTGRES_SERVICE → Variables"
    fi
else
    # Parse DATABASE_URL
    # Formato: postgresql://user:password@host:port/database
    echo ""
    print_success "DATABASE_URL encontrada!"
    echo ""
    echo "String de conexão completa:"
    echo "  $DATABASE_URL"
    echo ""
    
    # Extrair componentes
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        PGUSER="${BASH_REMATCH[1]}"
        PGPASSWORD="${BASH_REMATCH[2]}"
        PGHOST="${BASH_REMATCH[3]}"
        PGPORT="${BASH_REMATCH[4]}"
        PGDATABASE="${BASH_REMATCH[5]}"
        
        echo "Componentes:"
        echo "  Host:     $PGHOST"
        echo "  Port:     $PGPORT"
        echo "  User:     $PGUSER"
        echo "  Password: $PGPASSWORD"
        echo "  Database: $PGDATABASE"
    fi
fi

echo ""
print_info "Para conectar via psql:"
echo "  ${BLUE}railway connect postgres --service $POSTGRES_SERVICE${NC}"
echo ""
print_info "Ou use um cliente como DBeaver, pgAdmin, etc. com as credenciais acima"
