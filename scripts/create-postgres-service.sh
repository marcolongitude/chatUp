#!/bin/bash

# 🐘 Script para Criar Serviço PostgreSQL no Railway via CLI
# Projeto: terrific-balance

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

echo "🐘 Criando Serviço PostgreSQL no Railway"
echo "=========================================="
echo ""

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

# Ir para diretório backend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../backend" || exit 1

# Verificar se projeto está linkado
if ! railway status &> /dev/null; then
    print_error "Projeto não está linkado!"
    echo "Execute: railway link"
    exit 1
fi

PROJECT_NAME=$(railway status 2>&1 | grep "Project:" | awk '{print $2}')
print_success "Projeto: $PROJECT_NAME"
echo ""

# Verificar se serviço postgres já existe
print_info "Verificando serviços existentes..."
EXISTING_SERVICES=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 || echo "")

if echo "$EXISTING_SERVICES" | grep -q "^postgres$"; then
    print_warning "Serviço 'postgres' já existe!"
    echo ""
    read -p "Deseja fazer deploy novamente? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Cancelado pelo usuário"
        exit 0
    fi
    SERVICE_EXISTS=true
else
    print_info "Serviço 'postgres' não existe - será criado durante o deploy"
    SERVICE_EXISTS=false
fi

# Configurar Dockerfile customizado
print_info "Configurando Dockerfile customizado..."
echo ""

# Verificar se Dockerfile.postgres existe
if [ ! -f "Dockerfile.postgres" ]; then
    print_error "Dockerfile.postgres não encontrado!"
    exit 1
fi

print_success "Dockerfile.postgres encontrado"

# Verificar se railway.postgres.json existe
if [ ! -f "railway.postgres.json" ]; then
    print_info "Criando railway.postgres.json..."
    cat > railway.postgres.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.postgres"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    print_success "railway.postgres.json criado"
else
    print_info "railway.postgres.json já existe"
fi

# Para usar o Dockerfile específico, precisamos renomear temporariamente
# ou criar um symlink, ou usar o railway.json

# Estratégia: Renomear Dockerfile.postgres para Dockerfile temporariamente
print_info "Preparando para deploy..."
if [ -f "Dockerfile" ] && [ ! -f "Dockerfile.backup" ]; then
    mv Dockerfile Dockerfile.backup
    print_info "Backup do Dockerfile original criado"
fi

# Criar symlink ou copiar
if [ ! -f "Dockerfile" ]; then
    cp Dockerfile.postgres Dockerfile
    print_info "Dockerfile.postgres copiado como Dockerfile"
fi

# Fazer deploy
print_info "Fazendo deploy do PostgreSQL..."
echo ""

if [ "$SERVICE_EXISTS" = false ]; then
    print_info "Criando serviço 'postgres' durante o deploy..."
fi

# Fazer deploy - Railway criará o serviço se não existir
railway up --service postgres --detach 2>&1 || {
    print_error "Erro no deploy"
    
    # Restaurar Dockerfile original se existir backup
    if [ -f "Dockerfile.backup" ]; then
        mv Dockerfile.backup Dockerfile
        print_info "Dockerfile original restaurado"
    fi
    
    exit 1
}

# Restaurar Dockerfile original se existir backup
if [ -f "Dockerfile.backup" ]; then
    mv Dockerfile Dockerfile.postgres.tmp
    mv Dockerfile.backup Dockerfile
    rm -f Dockerfile.postgres.tmp
    print_info "Dockerfile original restaurado"
fi

print_success "Deploy iniciado!"
echo ""

# Aguardar um pouco e verificar status
print_info "Aguardando inicialização (15s)..."
sleep 15

# Verificar logs
print_info "Últimas linhas dos logs:"
railway logs --service postgres 2>&1 | tail -15

echo ""
print_success "Serviço PostgreSQL criado e deployado!"
echo ""
print_info "Próximos passos:"
echo "  1. Ver logs em tempo real: ${BLUE}railway logs --service postgres --follow${NC}"
echo "  2. Ver variáveis: ${BLUE}railway variables --service postgres${NC}"
echo "  3. Conectar ao banco: ${BLUE}railway connect postgres --service postgres${NC}"
echo "  4. Ver status: ${BLUE}railway status${NC}"
echo ""
