#!/bin/bash

# 🚀 Criar Serviço Backend no Railway e Fazer Deploy

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

echo "🚀 Criar Serviço Backend no Railway"
echo "===================================="
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Verificar se serviço já existe
print_info "Verificando serviços existentes..."
SERVICES=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4)
BACKEND_EXISTS=$(echo "$SERVICES" | grep -iE "backend|chatup" | head -1)

if [ -n "$BACKEND_EXISTS" ]; then
    print_success "Serviço backend já existe: $BACKEND_EXISTS"
    print_info "Linkando ao serviço existente..."
    railway service link "$BACKEND_EXISTS" 2>&1 > /dev/null
    print_success "Linkado ao serviço: $BACKEND_EXISTS"
else
    print_warning "Serviço backend não existe!"
    echo ""
    print_info "Para criar o serviço, execute manualmente:"
    echo ""
    echo "  ${BLUE}cd backend${NC}"
    echo "  ${BLUE}railway add --service backend${NC}"
    echo ""
    echo "Quando solicitado:"
    echo "  1. Escolha: ${GREEN}Empty Service${NC}"
    echo "  2. Nome: ${GREEN}backend${NC}"
    echo "  3. Variáveis: ${GREEN}Pressione Enter para pular${NC}"
    echo ""
    read -p "Deseja criar o serviço agora? (s/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        print_info "Criando serviço backend..."
        echo "Empty Service" | railway add --service backend 2>&1 | head -20
        sleep 2
        
        # Verificar se foi criado
        NEW_SERVICE=$(railway status --json 2>&1 | grep -o '"serviceName": "[^"]*"' | cut -d'"' -f4 | grep -iE "backend|chatup" | head -1)
        if [ -n "$NEW_SERVICE" ]; then
            print_success "Serviço criado: $NEW_SERVICE"
            railway service link "$NEW_SERVICE" 2>&1 > /dev/null
        else
            print_warning "Não foi possível detectar o serviço criado"
            print_info "Verifique manualmente: railway status"
        fi
    else
        print_info "Cancelado. Crie o serviço manualmente e depois execute o deploy."
        exit 0
    fi
fi

# Verificar se está linkado ao serviço correto
CURRENT_SERVICE=$(railway status 2>&1 | grep "Service:" | awk '{print $2}')
print_success "Serviço atual: $CURRENT_SERVICE"

# Configurar para deploy combinado
print_info "Configurando para deploy combinado (Backend + Electric)..."
[ -f "railway.json.backup" ] || cp railway.json railway.json.backup 2>/dev/null || true
[ -f "Dockerfile.backup" ] || cp Dockerfile Dockerfile.backup 2>/dev/null || true

cp railway.backend-with-electric.json railway.json 2>/dev/null || {
    print_warning "railway.backend-with-electric.json não encontrado"
    print_info "Usando Dockerfile.combined-final diretamente"
}

# Usar Dockerfile combinado
if [ -f "Dockerfile.combined-final" ]; then
    cp Dockerfile.combined-final Dockerfile
    print_success "Usando Dockerfile.combined-final"
else
    print_warning "Dockerfile.combined-final não encontrado!"
    print_info "Usando Dockerfile.backend-with-electric-simple"
    if [ -f "Dockerfile.backend-with-electric-simple" ]; then
        cp Dockerfile.backend-with-electric-simple Dockerfile
    else
        print_error "Nenhum Dockerfile combinado encontrado!"
        exit 1
    fi
fi

# Fazer deploy
echo ""
print_info "Fazendo deploy do serviço backend..."
railway up --service "$CURRENT_SERVICE" --detach 2>&1 | head -30

print_success "Deploy iniciado!"
echo ""
print_info "Ver logs: ${BLUE}railway logs --service $CURRENT_SERVICE --follow${NC}"
