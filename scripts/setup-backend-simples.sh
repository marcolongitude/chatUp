#!/bin/bash

# 🚀 Setup SIMPLES - Backend no Railway (Sem Docker)

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

echo "🚀 Setup SIMPLES - Backend Railway"
echo "===================================="
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar Railway CLI
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    echo "Instale: npm install -g @railway/cli"
    exit 1
fi

# Verificar autenticação
if ! railway whoami &> /dev/null; then
    print_error "Não autenticado!"
    echo "Execute: railway login"
    exit 1
fi

print_success "Railway CLI OK"
echo ""

# Verificar projeto linkado
if ! railway status &> /dev/null; then
    print_warning "Projeto não linkado"
    print_info "Linkando projeto..."
    railway link
fi

PROJECT=$(railway status 2>&1 | grep "Project:" | awk '{print $2}')
print_success "Projeto: $PROJECT"
echo ""

# Verificar se serviço backend existe
SERVICES=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4)
BACKEND_EXISTS=$(echo "$SERVICES" | grep -iE "backend|chatup" | head -1)

if [ -n "$BACKEND_EXISTS" ]; then
    print_success "Serviço encontrado: $BACKEND_EXISTS"
    railway service link "$BACKEND_EXISTS" 2>&1 > /dev/null
else
    print_warning "Serviço backend não existe!"
    echo ""
    print_info "Para criar o serviço, execute:"
    echo ""
    echo "  ${BLUE}railway add --service backend${NC}"
    echo ""
    echo "Quando perguntar:"
    echo "  1. Escolha: ${GREEN}Empty Service${NC}"
    echo "  2. Nome: ${GREEN}backend${NC}"
    echo "  3. Variáveis: ${GREEN}Pressione Enter${NC}"
    echo ""
    read -p "Deseja criar agora? (s/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        print_info "Criando serviço..."
        echo "Empty Service" | railway add --service backend 2>&1 | head -10
        sleep 2
        railway service link backend 2>&1 > /dev/null
    else
        print_info "Crie o serviço manualmente e execute este script novamente"
        exit 0
    fi
fi

# Verificar PostgreSQL
POSTGRES_EXISTS=$(echo "$SERVICES" | grep -iE "postgres" | head -1)
if [ -z "$POSTGRES_EXISTS" ]; then
    print_warning "PostgreSQL não encontrado!"
    print_info "Crie um serviço PostgreSQL primeiro"
else
    print_success "PostgreSQL encontrado: $POSTGRES_EXISTS"
fi

# Configurar variáveis
echo ""
print_info "Configurando variáveis de ambiente..."
echo ""

# Gerar JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-in-production")

print_info "Variáveis necessárias:"
echo "  DATABASE_URL=\${{$POSTGRES_EXISTS.DATABASE_URL}}"
echo "  NODE_ENV=production"
echo "  PORT=3000"
echo "  JWT_SECRET=$JWT_SECRET"
echo "  JWT_EXPIRES_IN=7d"
echo ""

read -p "Deseja configurar as variáveis agora? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    if [ -n "$POSTGRES_EXISTS" ]; then
        railway variables set "DATABASE_URL=\${{$POSTGRES_EXISTS.DATABASE_URL}}" 2>&1 | head -5
    fi
    railway variables set NODE_ENV=production 2>&1 | head -5
    railway variables set PORT=3000 2>&1 | head -5
    railway variables set JWT_SECRET="$JWT_SECRET" 2>&1 | head -5
    railway variables set JWT_EXPIRES_IN=7d 2>&1 | head -5
    print_success "Variáveis configuradas!"
else
    print_info "Configure as variáveis manualmente no Dashboard"
fi

# Deploy
echo ""
read -p "Deseja fazer deploy agora? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    print_info "Fazendo deploy..."
    railway up --service backend --detach 2>&1 | head -20
    print_success "Deploy iniciado!"
    echo ""
    print_info "Ver logs: ${BLUE}railway logs --service backend --follow${NC}"
else
    print_info "Execute: ${BLUE}railway up --service backend --detach${NC}"
fi

print_success "Setup completo!"
