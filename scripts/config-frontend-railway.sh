#!/bin/bash

# 📱 Configurar Frontend para Conectar no Backend Railway

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

echo "📱 Configurar Frontend para Railway"
echo "===================================="
echo ""

cd "$(dirname "$0")/.." || exit 1

# Obter URL do backend do Railway
print_info "Obtendo URL do backend Railway..."
cd backend 2>/dev/null || { print_error "Diretório backend não encontrado!"; exit 1; }

BACKEND_URL=$(railway domain 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$BACKEND_URL" ]; then
    print_warning "Não foi possível obter URL do Railway automaticamente"
    print_info "Digite a URL do backend (ex: https://backend-production-xxx.up.railway.app):"
    read -r BACKEND_URL
fi

cd ..

print_success "Backend URL: $BACKEND_URL"

# Testar conexão
print_info "Testando conexão com backend..."
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health" 2>&1)

if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    print_success "Backend está respondendo!"
    echo "  $HEALTH_RESPONSE"
else
    print_warning "Não foi possível conectar ao backend"
    print_info "Continuando mesmo assim..."
fi

echo ""

# Criar ou atualizar .env
ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    print_warning "Arquivo .env já existe"
    read -p "Deseja sobrescrever? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Criando backup e adicionando configurações..."
        cp "$ENV_FILE" "$ENV_FILE.backup"
        
        # Remover configurações antigas se existirem
        sed -i '/^EXPO_PUBLIC_API_URL=/d' "$ENV_FILE"
        sed -i '/^EXPO_PUBLIC_ELECTRIC_URL=/d' "$ENV_FILE"
        sed -i '/^EXPO_PUBLIC_ELECTRIC_API_URL=/d' "$ENV_FILE"
        
        # Adicionar novas
        echo "" >> "$ENV_FILE"
        echo "# Backend Railway" >> "$ENV_FILE"
        echo "EXPO_PUBLIC_API_URL=$BACKEND_URL" >> "$ENV_FILE"
        echo "EXPO_PUBLIC_ELECTRIC_URL=$(echo "$BACKEND_URL" | sed 's|https://|wss://|' | sed 's|http://|ws://|')" >> "$ENV_FILE"
        echo "EXPO_PUBLIC_ELECTRIC_API_URL=$BACKEND_URL" >> "$ENV_FILE"
        
        print_success "Configurações adicionadas ao .env existente"
    else
        print_info "Sobrescrevendo .env..."
    fi
fi

if [ ! -f "$ENV_FILE" ] || [[ $REPLY =~ ^[Ss]$ ]]; then
    print_info "Criando arquivo .env..."
    
    cat > "$ENV_FILE" << EOF
# Backend Railway
EXPO_PUBLIC_API_URL=$BACKEND_URL

# Electric SQL (WebSocket)
EXPO_PUBLIC_ELECTRIC_URL=$(echo "$BACKEND_URL" | sed 's|https://|wss://|' | sed 's|http://|ws://|')

# Electric SQL (HTTP API)
EXPO_PUBLIC_ELECTRIC_API_URL=$BACKEND_URL
EOF

    print_success "Arquivo .env criado!"
fi

echo ""
print_info "Configurações:"
echo "  EXPO_PUBLIC_API_URL=$BACKEND_URL"
echo "  EXPO_PUBLIC_ELECTRIC_URL=${BACKEND_URL/http/wss}"
echo "  EXPO_PUBLIC_ELECTRIC_API_URL=$BACKEND_URL"
echo ""

print_success "Configuração completa!"
echo ""
print_info "Próximos passos:"
echo "  1. Rebuild do app: ${BLUE}npx expo start --clear${NC}"
echo "  2. Ou build para dispositivo: ${BLUE}npx expo run:android${NC}"
echo ""
