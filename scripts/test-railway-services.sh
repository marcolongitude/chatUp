#!/bin/bash

# 🧪 Script de Teste dos 3 Serviços Railway
# Verifica se PostgreSQL, Backend e Electric estão funcionando

# Não usar set -e para permitir tratamento de erros
set +e

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

# Verificar quais serviços existem
print_info "Verificando serviços disponíveis..."

# Obter nomes reais dos serviços via JSON
SERVICES_JSON=$(railway status --json 2>&1)
SERVICE_NAMES=$(echo "$SERVICES_JSON" | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | sort -u)

SERVICES_FOUND=0
HAS_POSTGRES=false
HAS_CHATUP=false
HAS_ELECTRIC=false

for service in $SERVICE_NAMES; do
    case $service in
        postgres)
            HAS_POSTGRES=true
            SERVICES_FOUND=$((SERVICES_FOUND + 1))
            ;;
        chatUp|chatup|backend)
            HAS_CHATUP=true
            SERVICES_FOUND=$((SERVICES_FOUND + 1))
            BACKEND_SERVICE_NAME=$service
            ;;
        electric-sql|electric)
            HAS_ELECTRIC=true
            SERVICES_FOUND=$((SERVICES_FOUND + 1))
            ELECTRIC_SERVICE_NAME=$service
            ;;
    esac
done

# Definir nomes padrão se não detectados
BACKEND_SERVICE_NAME=${BACKEND_SERVICE_NAME:-"chatUp"}
ELECTRIC_SERVICE_NAME=${ELECTRIC_SERVICE_NAME:-"electric-sql"}

if [ $SERVICES_FOUND -eq 0 ]; then
    print_warning "Nenhum dos 3 serviços foi encontrado ainda!"
    echo ""
    print_info "Para criar os serviços, execute:"
    echo "  ${BLUE}./scripts/deploy-railway-services.sh${NC}"
    echo ""
    print_info "Ou crie manualmente via Railway Dashboard:"
    echo "  1. Acesse railway.app"
    echo "  2. Crie 3 serviços do repositório GitHub"
    echo "  3. Configure cada um com seu Dockerfile"
    echo ""
    exit 0
else
    print_success "Encontrados $SERVICES_FOUND de 3 serviços"
fi
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

# Verificar se serviço existe
if ! railway logs --service postgres 2>&1 | head -1 | grep -q "postgres\|PostgreSQL\|railway"; then
    print_warning "Serviço 'postgres' pode não existir ainda"
    print_info "Crie o serviço primeiro: railway up --service postgres --dockerfile Dockerfile.postgres"
else
    # Tentar verificar via logs
    POSTGRES_LOGS=$(railway logs --service postgres 2>&1 | tail -10)
    
    if echo "$POSTGRES_LOGS" | grep -q "ready to accept connections\|database system is ready"; then
        print_success "PostgreSQL está rodando!"
    elif echo "$POSTGRES_LOGS" | grep -q "starting PostgreSQL\|listening"; then
        print_warning "PostgreSQL está iniciando..."
    else
        print_warning "PostgreSQL pode não estar rodando ou ainda não foi deployado"
        print_info "Verifique: railway logs --service postgres"
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
print_info "Obtendo URL do Backend (serviço: $BACKEND_SERVICE_NAME)..."

# Verificar se serviço existe
BACKEND_LOGS=$(railway logs --service "$BACKEND_SERVICE_NAME" 2>&1 | tail -20)

if echo "$BACKEND_LOGS" | head -1 | grep -q "Service.*not found\|No service"; then
    print_warning "Serviço '$BACKEND_SERVICE_NAME' não existe ainda"
    print_info "Crie o serviço primeiro: railway up --service $BACKEND_SERVICE_NAME --dockerfile Dockerfile.backend"
elif echo "$BACKEND_LOGS" | grep -q "Nest application successfully started\|Application is running"; then
    print_success "Backend está rodando!"
    
    # Tentar extrair URL
    print_info "Para testar o health check, obtenha a URL:"
    echo "${BLUE}railway status --service $BACKEND_SERVICE_NAME${NC}"
    echo ""
    echo "Então teste:"
    echo "${BLUE}curl https://seu-backend.railway.app/health${NC}"
elif echo "$BACKEND_LOGS" | grep -q "error\|Error\|ERROR\|failed\|Failed"; then
    print_error "Backend tem erros nos logs"
    print_info "Verifique: railway logs --service $BACKEND_SERVICE_NAME"
    echo ""
    print_info "Últimas linhas dos logs:"
    echo "$BACKEND_LOGS" | tail -5
else
    print_warning "Backend pode não estar rodando ou ainda não foi deployado"
    print_info "Verifique: railway logs --service $BACKEND_SERVICE_NAME"
fi

echo ""

# Teste 3: Electric SQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testando Electric SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Verificando Electric SQL (serviço: $ELECTRIC_SERVICE_NAME)..."
ELECTRIC_LOGS=$(railway logs --service "$ELECTRIC_SERVICE_NAME" 2>&1 | tail -20)

if echo "$ELECTRIC_LOGS" | head -1 | grep -q "Service.*not found\|No service"; then
    print_warning "Serviço '$ELECTRIC_SERVICE_NAME' não existe ainda"
    print_info "Crie o serviço primeiro: railway up --service $ELECTRIC_SERVICE_NAME --dockerfile Dockerfile.electric"
elif echo "$ELECTRIC_LOGS" | grep -q "Electric.*started\|listening\|Electric SQL"; then
    print_success "Electric SQL está rodando!"
    
    print_info "Para testar o Electric, obtenha a URL:"
    echo "${BLUE}railway status --service $ELECTRIC_SERVICE_NAME${NC}"
elif echo "$ELECTRIC_LOGS" | grep -q "error\|Error\|ERROR\|failed\|Failed"; then
    print_error "Electric SQL tem erros nos logs"
    print_info "Verifique: railway logs --service $ELECTRIC_SERVICE_NAME"
    echo ""
    print_info "Últimas linhas dos logs:"
    echo "$ELECTRIC_LOGS" | tail -5
else
    print_warning "Electric SQL pode não estar rodando ou ainda não foi deployado"
    print_info "Verifique: railway logs --service $ELECTRIC_SERVICE_NAME"
fi

echo ""

# Teste 4: Verificar variáveis de ambiente
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Verificando Variáveis de Ambiente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Backend - Variáveis críticas (serviço: $BACKEND_SERVICE_NAME):"
BACKEND_VARS=$(railway variables --service "$BACKEND_SERVICE_NAME" 2>&1)

# Verificar se serviço existe
if echo "$BACKEND_VARS" | grep -q "Service.*not found\|No service"; then
    print_warning "Serviço '$BACKEND_SERVICE_NAME' não existe ainda - não é possível verificar variáveis"
    print_info "Crie o serviço primeiro e configure as variáveis"
else
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
fi

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
echo "  ${BLUE}railway logs --service $BACKEND_SERVICE_NAME --follow${NC}"
echo "  ${BLUE}railway logs --service $ELECTRIC_SERVICE_NAME --follow${NC}"
echo ""
echo "Conectar ao PostgreSQL:"
echo "  ${BLUE}railway connect postgres --service postgres${NC}"
echo ""
echo "Executar migrations:"
echo "  ${BLUE}railway run --service $BACKEND_SERVICE_NAME npm run migration:run${NC}"
echo ""
echo "SSH no backend:"
echo "  ${BLUE}railway ssh --service $BACKEND_SERVICE_NAME${NC}"
echo ""

echo ""
print_success "Testes concluídos! ✨"
echo ""

# Resumo final
if [ $SERVICES_FOUND -lt 3 ]; then
    print_warning "Alguns serviços ainda não foram criados"
    echo ""
    print_info "Próximos passos:"
    echo "  1. Crie os serviços faltantes"
    echo "  2. Configure as variáveis de ambiente"
    echo "  3. Execute migrations"
    echo "  4. Execute este script novamente"
    echo ""
fi

print_info "Consulte: RAILWAY_3_SERVICES_SETUP.md para mais detalhes"
