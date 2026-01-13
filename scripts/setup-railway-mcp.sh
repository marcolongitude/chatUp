#!/bin/bash

# 🚂 Script de Configuração Railway MCP
# Este script configura o MCP Railway no Cursor e linka o projeto

set -e

echo "🚂 Railway MCP Setup - ChatUp"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para printar com cor
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Railway CLI está instalado
echo "1️⃣  Verificando Railway CLI..."
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI não encontrado!"
    echo ""
    echo "Instale com:"
    echo "  npm install -g @railway/cli"
    exit 1
fi
print_success "Railway CLI instalado: $(railway --version)"
echo ""

# Verificar autenticação
echo "2️⃣  Verificando autenticação..."
if ! railway whoami &> /dev/null; then
    print_error "Não autenticado no Railway!"
    echo ""
    echo "Execute: railway login"
    exit 1
fi
RAILWAY_USER=$(railway whoami)
print_success "Autenticado: $RAILWAY_USER"
echo ""

# Verificar Node.js
echo "3️⃣  Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado!"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js instalado: $NODE_VERSION"
echo ""

# Criar arquivo de configuração MCP
echo "4️⃣  Configurando MCP Railway no Cursor..."
CURSOR_DIR=".cursor"
MCP_FILE="$CURSOR_DIR/mcp.json"

# Criar diretório .cursor se não existir
mkdir -p "$CURSOR_DIR"

# Verificar se já existe configuração
if [ -f "$MCP_FILE" ]; then
    print_warning "Arquivo $MCP_FILE já existe!"
    echo ""
    read -p "Deseja sobrescrever? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Configuração MCP não alterada"
        echo ""
        echo "Para adicionar manualmente, adicione ao $MCP_FILE:"
        echo ""
        cat .cursor/mcp.railway.example.json
        echo ""
    else
        cp .cursor/mcp.railway.example.json "$MCP_FILE"
        print_success "Configuração MCP atualizada!"
    fi
else
    cp .cursor/mcp.railway.example.json "$MCP_FILE"
    print_success "Configuração MCP criada!"
fi
echo ""

# Listar projetos Railway
echo "5️⃣  Listando projetos Railway..."
print_info "Seus projetos:"
railway list
echo ""

# Perguntar qual projeto linkar
print_warning "IMPORTANTE: Você precisa linkar o projeto Railway manualmente"
echo ""
echo "Execute os seguintes comandos:"
echo ""
echo -e "${BLUE}cd backend${NC}"
echo -e "${BLUE}railway link${NC}"
echo ""
echo "Então selecione:"
echo "  1. Workspace/Team"
echo "  2. Projeto (provavelmente 'chatUp' ou similar)"
echo "  3. Environment (production)"
echo ""

# Verificar se já está linkado
cd backend 2>/dev/null || true
if railway status &> /dev/null; then
    print_success "Projeto já está linkado!"
    echo ""
    railway status
    echo ""
else
    print_warning "Projeto ainda não está linkado"
    echo ""
    read -p "Deseja linkar agora? (s/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        railway link
    fi
fi

# Testar MCP
echo ""
echo "6️⃣  Testando instalação do MCP..."
print_info "Testando @railway/mcp-server..."
if npx -y @railway/mcp-server --help &> /dev/null; then
    print_success "MCP Railway instalado e funcionando!"
else
    print_error "Erro ao testar MCP Railway"
    echo ""
    echo "Tente instalar globalmente:"
    echo "  npm install -g @railway/mcp-server"
fi
echo ""

# Instruções finais
echo "================================"
echo "🎉 Configuração Concluída!"
echo "================================"
echo ""
print_info "Próximos passos:"
echo ""
echo "1. Reinicie o Cursor (feche e abra novamente)"
echo ""
echo "2. No Cursor Chat, teste o MCP:"
echo "   @railway-mcp-server list my Railway projects"
echo ""
echo "3. Consulte o guia completo:"
echo "   cat RAILWAY_MCP_SETUP.md"
echo ""
echo "4. Comandos úteis:"
echo "   railway status          # Ver status do projeto"
echo "   railway logs            # Ver logs"
echo "   railway variables       # Ver variáveis de ambiente"
echo ""
print_success "Setup completo! ✨"
