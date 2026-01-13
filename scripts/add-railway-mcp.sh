#!/bin/bash

# Script para adicionar Railway MCP ao mcp.json existente

echo "🚂 Adicionando Railway MCP ao Cursor..."
echo ""

MCP_FILE=".cursor/mcp.json"

# Verificar se arquivo existe
if [ ! -f "$MCP_FILE" ]; then
    echo "❌ Arquivo $MCP_FILE não encontrado!"
    echo ""
    echo "Criando novo arquivo..."
    mkdir -p .cursor
    cp .cursor/mcp.railway.example.json "$MCP_FILE"
    echo "✅ Arquivo criado!"
    exit 0
fi

# Fazer backup
cp "$MCP_FILE" "$MCP_FILE.backup"
echo "✅ Backup criado: $MCP_FILE.backup"
echo ""

# Verificar se Railway MCP já existe
if grep -q "railway-mcp-server" "$MCP_FILE"; then
    echo "⚠️  Railway MCP já está configurado!"
    echo ""
    echo "Configuração atual:"
    cat "$MCP_FILE"
    exit 0
fi

# Adicionar Railway MCP usando jq (se disponível)
if command -v jq &> /dev/null; then
    echo "📝 Adicionando Railway MCP com jq..."
    jq '.mcpServers["railway-mcp-server"] = {"command": "npx", "args": ["-y", "@railway/mcp-server"]}' "$MCP_FILE" > "$MCP_FILE.tmp"
    mv "$MCP_FILE.tmp" "$MCP_FILE"
    echo "✅ Railway MCP adicionado!"
    echo ""
    echo "Nova configuração:"
    cat "$MCP_FILE"
else
    echo "⚠️  jq não encontrado - adicione manualmente"
    echo ""
    echo "Adicione ao $MCP_FILE:"
    echo ""
    cat .cursor/mcp.railway.example.json
    echo ""
    echo "Instruções completas em: RAILWAY_MCP_MANUAL_SETUP.md"
fi

echo ""
echo "🎉 Próximos passos:"
echo "1. Reinicie o Cursor"
echo "2. Execute: cd backend && railway link"
echo "3. Teste: @railway-mcp-server list projects"
