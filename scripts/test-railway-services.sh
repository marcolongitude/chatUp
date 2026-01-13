#!/bin/bash

# 🧪 Script de Teste dos 3 Serviços Railway
# Verifica se PostgreSQL, Backend e Electric estão funcionando

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🧪 Testando Serviços Railway"
echo "============================="
echo ""

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    exit 1
fi

cd backend

# Verificar projeto linkado
if ! railway status &> /dev/null; then
    print_error "Projeto não está linkado!"
    echo "Execute: railway link"
    exit 1
fi

PROJECT_NAME=$(railway status 2>&1 | grep "Project:" | awk '{print $2}')
print_info "Projeto: $PROJECT_NAME"
echo ""

# Função para testar URL
test_url() {
    local SERVICE=$1
    local URL=$2
    local ENDPOINT=$3
    
    print_info "Testando $SERVICE..."
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$URL$ENDPOINT" | grep -q "200\|301\|302"; then
        print_success "$SERVICE está respondendo!"
        return 0
    else
        print_error "$SERVICE não está respondendo"
        return 1
    fi
}

# Teste 1: PostgreSQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testando PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Verificando conexão com PostgreSQL..."
if railway run --service postgres pg_isready -U admin -d chatup &> /dev/null; then
    print_success "PostgreSQL está rodando!"
else
    print_warning "Não foi possível verificar PostgreSQL via pg_isready"
    print_info "Tentando verificar via logs..."
    
    if railway logs --service postgres 2>&1 | tail -5 | grep -q "ready to accept connections"; then
        print_success "PostgreSQL está rodando (verificado via logs)!"
    else
        print_error "PostgreSQL pode não estar rodando"
    fi
fi

# Verificar tabelas
print_info "Verificando tabelas..."
echo ""
print_info "Execute manualmente para verificar tabelas:"
echo "${BLUE}railway connect postgres --service postgres${NC}"
echo "Então no psql: ${BLUE}\\dt${NC}"
echo ""

# Teste 2: Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testando Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tentar obter URL do backend
print_info "Obtendo URL do Backend..."
BACKEND_LOGS=$(railway logs --service backend 2>&1 | tail -20)

if echo "$BACKEND_LOGS" | grep -q "Nest application successfully started"; then
    print_success "Backend está rodando!"
    
    # Tentar extrair URL
    print_info "Para testar o health check, obtenha a URL:"
    echo "${BLUE}railway status --service backend${NC}"
    echo ""
    echo "Então teste:"
    echo "${BLUE}curl https://seu-backend.railway.app/health${NC}"
    
else
    print_warning "Backend pode não estar rodando"
    print_info "Verifique os logs:"
    echo "${BLUE}railway logs --service backend${NC}"
fi

echo ""

# Teste 3: Electric SQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testando Electric SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Verificando Electric SQL..."
ELECTRIC_LOGS=$(railway logs --service electric 2>&1 | tail -20)

if echo "$ELECTRIC_LOGS" | grep -q "Electric.*started\|listening"; then
    print_success "Electric SQL está rodando!"
    
    print_info "Para testar o Electric, obtenha a URL:"
    echo "${BLUE}railway status --service electric${NC}"
    
else
    print_warning "Electric SQL pode não estar rodando"
    print_info "Verifique os logs:"
    echo "${BLUE}railway logs --service electric${NC}"
fi

echo ""

# Teste 4: Verificar variáveis de ambiente
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Verificando Variáveis de Ambiente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Backend - Variáveis críticas:"
BACKEND_VARS=$(railway variables --service backend 2>&1)

check_var() {
    local VAR_NAME=$1
    if echo "$BACKEND_VARS" | grep -q "$VAR_NAME"; then
        print_success "$VAR_NAME configurada"
    else
        print_error "$VAR_NAME NÃO configurada"
    fi
}

check_var "DATABASE_URL"
check_var "NODE_ENV"
check_var "JWT_SECRET"

echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumo dos Testes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Comandos úteis:"
echo ""
echo "Ver status de todos os serviços:"
echo "  ${BLUE}railway status${NC}"
echo ""
echo "Ver logs em tempo real:"
echo "  ${BLUE}railway logs --service postgres --follow${NC}"
echo "  ${BLUE}railway logs --service backend --follow${NC}"
echo "  ${BLUE}railway logs --service electric --follow${NC}"
echo ""
echo "Conectar ao PostgreSQL:"
echo "  ${BLUE}railway connect postgres --service postgres${NC}"
echo ""
echo "Executar migrations:"
echo "  ${BLUE}railway run --service backend npm run migration:run${NC}"
echo ""
echo "SSH no backend:"
echo "  ${BLUE}railway ssh --service backend${NC}"
echo ""

print_success "Testes concluídos! ✨"
echo ""
print_info "Consulte: RAILWAY_3_SERVICES_SETUP.md para mais detalhes"
