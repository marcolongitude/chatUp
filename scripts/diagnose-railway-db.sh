#!/bin/bash

# 🔍 Script de Diagnóstico Railway Database Connection
# Analisa a configuração e sugere correções

set -e

echo "🔍 Diagnóstico de Conexão Railway Database"
echo "=========================================="
echo ""

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

# Verificar se está no diretório backend
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Execute este script no diretório backend!"
    exit 1
fi

# 1. Verificar projeto linkado
echo "1️⃣  Verificando projeto Railway linkado..."
PROJECT_INFO=$(railway status 2>&1)
if echo "$PROJECT_INFO" | grep -q "No linked project"; then
    print_error "Projeto não está linkado!"
    echo ""
    echo "Execute: railway link"
    exit 1
fi

PROJECT_NAME=$(echo "$PROJECT_INFO" | grep "Project:" | awk '{print $2}')
ENVIRONMENT=$(echo "$PROJECT_INFO" | grep "Environment:" | awk '{print $2}')
SERVICE=$(echo "$PROJECT_INFO" | grep "Service:" | awk '{print $2}')

print_success "Projeto: $PROJECT_NAME"
print_success "Environment: $ENVIRONMENT"
print_success "Service: $SERVICE"
echo ""

# 2. Listar todos os serviços disponíveis
echo "2️⃣  Verificando serviços disponíveis..."
print_info "Projeto: $PROJECT_NAME"
echo ""

# 3. Verificar variáveis de ambiente do serviço atual
echo "3️⃣  Variáveis de ambiente do serviço '$SERVICE'..."
railway variables 2>&1 | head -30
echo ""

# 4. Verificar logs recentes
echo "4️⃣  Últimos logs do serviço '$SERVICE'..."
railway logs 2>&1 | tail -20
echo ""

# 5. Análise e recomendações
echo "=========================================="
echo "📊 ANÁLISE E RECOMENDAÇÕES"
echo "=========================================="
echo ""

if [ "$SERVICE" = "postgres" ]; then
    print_warning "Você está linkado ao serviço PostgreSQL!"
    echo ""
    echo "Para ver/configurar o serviço Backend:"
    echo ""
    echo "  1. Liste os projetos:"
    echo "     ${BLUE}railway list${NC}"
    echo ""
    echo "  2. Veja se existe um serviço 'backend' ou similar"
    echo ""
    echo "  3. Se NÃO existe serviço backend:"
    echo "     ${YELLOW}Você precisa criar um serviço backend na Railway!${NC}"
    echo ""
    echo "  4. Se existe serviço backend, linke a ele:"
    echo "     ${BLUE}# Opção A: Via arquivo de configuração${NC}"
    echo "     ${BLUE}echo 'backend' > .railway-service${NC}"
    echo ""
    echo "     ${BLUE}# Opção B: Criar novo serviço via Railway Dashboard${NC}"
    echo "     ${BLUE}# 1. Acesse railway.app${NC}"
    echo "     ${BLUE}# 2. Selecione projeto: $PROJECT_NAME${NC}"
    echo "     ${BLUE}# 3. Clique em '+ New' → 'GitHub Repo'${NC}"
    echo "     ${BLUE}# 4. Selecione o repositório chatUp${NC}"
    echo "     ${BLUE}# 5. Configure Root Directory: backend${NC}"
    echo ""
    
    # Verificar se DATABASE_URL está disponível
    print_info "Verificando DATABASE_URL do PostgreSQL..."
    PGHOST=$(railway variables 2>&1 | grep "RAILWAY_PRIVATE_DOMAIN" | awk -F '│' '{print $3}' | xargs)
    PGPORT=$(railway variables 2>&1 | grep "PGPORT" | awk -F '│' '{print $3}' | xargs)
    PGUSER=$(railway variables 2>&1 | grep "PGUSER" | awk -F '│' '{print $3}' | xargs)
    PGPASSWORD=$(railway variables 2>&1 | grep "PGPASSWORD" | awk -F '│' '{print $3}' | xargs)
    PGDATABASE=$(railway variables 2>&1 | grep "PGDATABASE" | awk -F '│' '{print $3}' | xargs)
    
    if [ -n "$PGHOST" ] && [ -n "$PGPORT" ]; then
        print_success "PostgreSQL está configurado!"
        echo ""
        echo "DATABASE_URL para o backend:"
        echo "${GREEN}postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE${NC}"
        echo ""
        echo "Configure no serviço Backend:"
        echo "${BLUE}DATABASE_URL=\${{Postgres.DATABASE_URL}}${NC}"
    fi
    
elif [ "$SERVICE" = "backend" ] || [ "$SERVICE" = "chatup-backend" ]; then
    print_success "Você está linkado ao serviço Backend!"
    echo ""
    
    # Verificar se DATABASE_URL está configurada
    if railway variables 2>&1 | grep -q "DATABASE_URL"; then
        print_success "DATABASE_URL está configurada!"
        
        # Verificar outras variáveis necessárias
        echo ""
        echo "Verificando variáveis obrigatórias:"
        
        VARS_OK=true
        
        if railway variables 2>&1 | grep -q "NODE_ENV"; then
            print_success "NODE_ENV configurada"
        else
            print_error "NODE_ENV não configurada"
            VARS_OK=false
        fi
        
        if railway variables 2>&1 | grep -q "JWT_SECRET"; then
            print_success "JWT_SECRET configurada"
        else
            print_error "JWT_SECRET não configurada"
            VARS_OK=false
        fi
        
        if railway variables 2>&1 | grep -q "PORT"; then
            print_success "PORT configurada"
        else
            print_warning "PORT não configurada (Railway usará padrão)"
        fi
        
        if [ "$VARS_OK" = false ]; then
            echo ""
            print_warning "Configure as variáveis faltantes:"
            echo ""
            echo "Via Railway Dashboard:"
            echo "  1. Acesse railway.app → $PROJECT_NAME → Backend"
            echo "  2. Vá em 'Variables'"
            echo "  3. Adicione:"
            echo "     ${BLUE}NODE_ENV=production${NC}"
            echo "     ${BLUE}JWT_SECRET=<gere com: openssl rand -base64 32>${NC}"
            echo "     ${BLUE}PORT=3000${NC}"
        fi
        
    else
        print_error "DATABASE_URL não está configurada!"
        echo ""
        echo "Configure no Railway Dashboard:"
        echo "  1. Acesse railway.app → $PROJECT_NAME → Backend"
        echo "  2. Vá em 'Variables'"
        echo "  3. Adicione:"
        echo "     ${BLUE}DATABASE_URL=\${{Postgres.DATABASE_URL}}${NC}"
        echo ""
        echo "A sintaxe \${{Postgres.DATABASE_URL}} cria uma referência ao serviço PostgreSQL"
    fi
    
    # Verificar logs de erro
    echo ""
    print_info "Verificando logs de erro..."
    if railway logs 2>&1 | grep -i "error\|failed\|cannot connect"; then
        print_warning "Erros encontrados nos logs (veja acima)"
    else
        print_success "Nenhum erro crítico encontrado nos logs recentes"
    fi
    
else
    print_warning "Serviço desconhecido: $SERVICE"
    echo ""
    echo "Serviços esperados: 'postgres' ou 'backend'"
fi

echo ""
echo "=========================================="
echo "📚 DOCUMENTAÇÃO"
echo "=========================================="
echo ""
echo "Consulte os guias criados:"
echo "  - ${BLUE}RAILWAY_SETUP.md${NC} - Setup completo"
echo "  - ${BLUE}DATABASE_TROUBLESHOOTING.md${NC} - Troubleshooting"
echo "  - ${BLUE}RAILWAY_CLEANUP.md${NC} - Limpeza Electric SQL"
echo ""
print_success "Diagnóstico concluído! ✨"
