#!/bin/bash
set -euo pipefail

PORT="${PORT:-9092}"
RANCHER_MCP_DIR="${RANCHER_MCP_DIR:-/tmp/rancher-ai-mcp}"

if ! command -v go >/dev/null 2>&1; then
  echo "❌ Go não encontrado. Instale Go para iniciar o rancher-ai-mcp local."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Git não encontrado. Instale Git para baixar o rancher-ai-mcp."
  exit 1
fi

echo "🚀 Iniciando rancher-ai-mcp local em http://127.0.0.1:${PORT}"
echo "ℹ️  Modo local com --insecure (desenvolvimento)."
echo "ℹ️  Para o Cursor usar os tools, exporte RANCHER_TOKEN antes de abrir/reiniciar o Cursor."

if [[ ! -d "${RANCHER_MCP_DIR}/.git" ]]; then
  echo "📥 Clonando rancher-ai-mcp em ${RANCHER_MCP_DIR}..."
  rm -rf "${RANCHER_MCP_DIR}"
  git clone --depth 1 https://github.com/rancher/rancher-ai-mcp.git "${RANCHER_MCP_DIR}"
else
  echo "🔄 Atualizando rancher-ai-mcp em ${RANCHER_MCP_DIR}..."
  git -C "${RANCHER_MCP_DIR}" fetch --depth 1 origin main
  git -C "${RANCHER_MCP_DIR}" reset --hard origin/main
fi

cd "${RANCHER_MCP_DIR}"
exec go run . serve --insecure --port "${PORT}"
