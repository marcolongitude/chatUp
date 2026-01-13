#!/bin/bash

# 🚀 Script de Deploy Completo - 3 Serviços Railway
# PostgreSQL + Backend (NestJS) + Electric SQL

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
print_step() { echo -e "${BLUE}$1${NC}"; }

echo "🚀 Railway - Deploy de 3 Serviços"
echo "===================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "backend/package.json" ]; then
    print_error "Execute este script na raiz do projeto!"
    exit 1
fi

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    echo "Instale com: npm install -g @railway/cli"
    exit 1
fi

# Verificar autenticação
if ! railway whoami &> /dev/null; then
    print_error "Não autenticado no Railway!"
    echo "Execute: railway login"
    exit 1
fi

print_success "Railway CLI configurado"
echo ""

# Verificar se projeto está linkado
cd backend
if ! railway status &> /dev/null; then
    print_warning "Projeto não está linkado"
    echo ""
    read -p "Deseja criar um novo projeto? (s/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        railway init
    else
        print_error "Projeto precisa estar linkado. Execute: railway link"
        exit 1
    fi
fi

PROJECT_NAME=$(railway status 2>&1 | grep "Project:" | awk '{print $2}')
print_success "Projeto: $PROJECT_NAME"
echo ""

# Detectar nomes reais dos serviços
print_info "Detectando nomes dos serviços..."
SERVICES_JSON=$(railway status --json 2>&1)
SERVICE_NAMES=$(echo "$SERVICES_JSON" | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | sort -u)

# Detectar nomes dos serviços
BACKEND_SERVICE_NAME="chatUp"
ELECTRIC_SERVICE_NAME="electric-sql"

for service in $SERVICE_NAMES; do
    case $service in
        chatUp|chatup|backend)
            BACKEND_SERVICE_NAME=$service
            ;;
        electric-sql|electric)
            ELECTRIC_SERVICE_NAME=$service
            ;;
    esac
done

print_info "Serviços detectados:"
echo "  - PostgreSQL: postgres"
echo "  - Backend: $BACKEND_SERVICE_NAME"
echo "  - Electric: $ELECTRIC_SERVICE_NAME"
echo ""

# Menu de opções
echo "Escolha uma opção:"
echo "1) Deploy completo (PostgreSQL + Backend + Electric)"
echo "2) Deploy apenas PostgreSQL"
echo "3) Deploy apenas Backend"
echo "4) Deploy apenas Electric"
echo "5) Executar migrations"
echo "6) Criar publication no PostgreSQL"
echo "7) Sair"
echo ""
read -p "Opção: " OPTION

case $OPTION in
    1)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "1️⃣  Deploying PostgreSQL..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        print_info "Verificando se serviço postgres existe..."
        # Note: Railway CLI não tem comando direto para verificar serviços
        # Vamos tentar fazer deploy e ver o resultado
        
        print_info "Fazendo deploy do PostgreSQL..."
        echo "Comando: railway up --service postgres --dockerfile Dockerfile.postgres"
        echo ""
        read -p "Confirmar deploy do PostgreSQL? (s/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            railway up --service postgres --dockerfile Dockerfile.postgres --detach || {
                print_warning "Erro no deploy do PostgreSQL"
                print_info "Você pode precisar criar o serviço manualmente no Dashboard"
            }
            print_success "PostgreSQL deploy iniciado"
        fi
        
        echo ""
        print_info "Aguardando PostgreSQL iniciar (30s)..."
        sleep 30
        
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "2️⃣  Deploying Backend ($BACKEND_SERVICE_NAME)..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        print_info "Fazendo deploy do Backend..."
        echo "Comando: railway up --service $BACKEND_SERVICE_NAME --dockerfile Dockerfile.backend"
        echo ""
        read -p "Confirmar deploy do Backend? (s/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            railway up --service "$BACKEND_SERVICE_NAME" --dockerfile Dockerfile.backend --detach || {
                print_warning "Erro no deploy do Backend"
                print_info "Você pode precisar criar o serviço manualmente no Dashboard"
            }
            print_success "Backend deploy iniciado"
        fi
        
        echo ""
        print_info "Aguardando Backend iniciar (30s)..."
        sleep 30
        
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "3️⃣  Running Migrations..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        read -p "Executar migrations agora? (s/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            railway run --service "$BACKEND_SERVICE_NAME" npm run migration:run || {
                print_error "Erro ao executar migrations"
                print_info "Tente manualmente: railway run --service $BACKEND_SERVICE_NAME npm run migration:run"
            }
        fi
        
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "4️⃣  Deploying Electric SQL ($ELECTRIC_SERVICE_NAME)..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        print_info "Fazendo deploy do Electric..."
        echo "Comando: railway up --service $ELECTRIC_SERVICE_NAME --dockerfile Dockerfile.electric"
        echo ""
        read -p "Confirmar deploy do Electric? (s/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            railway up --service "$ELECTRIC_SERVICE_NAME" --dockerfile Dockerfile.electric --detach || {
                print_warning "Erro no deploy do Electric"
                print_info "Você pode precisar criar o serviço manualmente no Dashboard"
            }
            print_success "Electric deploy iniciado"
        fi
        ;;
        
    2)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "Deploying PostgreSQL..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        railway up --service postgres --dockerfile Dockerfile.postgres
        ;;
        
    3)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "Deploying Backend ($BACKEND_SERVICE_NAME)..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        railway up --service "$BACKEND_SERVICE_NAME" --dockerfile Dockerfile.backend
        ;;
        
    4)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "Deploying Electric SQL ($ELECTRIC_SERVICE_NAME)..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        railway up --service "$ELECTRIC_SERVICE_NAME" --dockerfile Dockerfile.electric
        ;;
        
    5)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "Running Migrations..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        railway run --service "$BACKEND_SERVICE_NAME" npm run migration:run
        ;;
        
    6)
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        print_step "Creating Publication..."
        print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        print_info "Conectando ao PostgreSQL..."
        echo ""
        print_warning "Execute no psql:"
        echo ""
        echo "CREATE PUBLICATION IF NOT EXISTS electric_publication"
        echo "FOR TABLE messages, users, keys, pre_keys;"
        echo ""
        echo "\\dRp+"
        echo ""
        railway connect postgres --service postgres
        ;;
        
    7)
        print_info "Saindo..."
        exit 0
        ;;
        
    *)
        print_error "Opção inválida!"
        exit 1
        ;;
esac

echo ""
print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Deploy concluído!"
print_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Próximos passos:"
echo ""
echo "1. Verificar logs dos serviços:"
echo "   ${BLUE}railway logs --service postgres${NC}"
echo "   ${BLUE}railway logs --service $BACKEND_SERVICE_NAME${NC}"
echo "   ${BLUE}railway logs --service $ELECTRIC_SERVICE_NAME${NC}"
echo ""
echo "2. Criar publication (se ainda não criou):"
echo "   ${BLUE}./scripts/deploy-railway-services.sh${NC} (opção 6)"
echo ""
echo "3. Testar serviços:"
echo "   ${BLUE}./scripts/test-railway-services.sh${NC}"
echo ""
echo "4. Configurar variáveis de ambiente:"
echo "   ${BLUE}Acesse railway.app → Projeto → Cada serviço → Variables${NC}"
echo ""

print_success "Documentação completa: RAILWAY_3_SERVICES_SETUP.md"
