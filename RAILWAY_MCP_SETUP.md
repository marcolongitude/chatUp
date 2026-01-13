# 🤖 Railway MCP Server - Configuração

## 📋 O que é o Railway MCP Server?

O **Railway MCP Server** é um servidor experimental do Model Context Protocol (MCP) que permite interagir com seus projetos Railway usando linguagem natural através de assistentes de IA (como o Cursor).

### 🎯 Funcionalidades

Com o Railway MCP você pode:

- ✅ **Gerenciar Projetos**: Listar, criar e linkar projetos
- ✅ **Gerenciar Serviços**: Listar, linkar, fazer deploy de serviços
- ✅ **Gerenciar Ambientes**: Criar e linkar ambientes
- ✅ **Variáveis de Ambiente**: Listar e configurar variáveis
- ✅ **Monitoramento**: Recuperar logs de serviços
- ✅ **Deploy**: Fazer deploy de templates

## 🚀 Pré-requisitos

1. ✅ **Railway CLI instalado**:
   ```bash
   npm install -g @railway/cli
   ```

2. ✅ **Autenticado no Railway**:
   ```bash
   railway login
   ```

3. ✅ **Node.js >= 16** instalado

## 📦 Instalação do MCP Railway

### Opção 1: Cursor (Recomendado para este projeto)

1. **Copiar configuração de exemplo**:
   ```bash
   cp .cursor/mcp.railway.example.json .cursor/mcp.json
   ```

2. **Ou adicionar manualmente ao `.cursor/mcp.json`**:
   ```json
   {
     "mcpServers": {
       "railway-mcp-server": {
         "command": "npx",
         "args": ["-y", "@railway/mcp-server"]
       }
     }
   }
   ```

3. **Reiniciar o Cursor**:
   - Feche e abra o Cursor novamente
   - Ou use: `Ctrl+Shift+P` → "Reload Window"

### Opção 2: VS Code

Adicione ao `.vscode/mcp.json`:

```json
{
  "servers": {
    "railway-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
```

### Opção 3: Claude Desktop

```bash
claude mcp add railway-mcp-server -- npx -y @railway/mcp-server
```

## 🔗 Linkar Projeto Railway

Antes de usar o MCP, você precisa linkar o projeto local ao Railway:

```bash
# No diretório do backend
cd backend

# Linkar ao projeto Railway
railway link

# Selecione:
# 1. Team/Workspace
# 2. Projeto (chatUp)
# 3. Environment (production)
```

**Verificar link**:
```bash
railway status
```

**Resultado esperado**:
```
Project: chatUp
Environment: production
Service: backend
```

## 🧪 Testar MCP Railway

### 1. Via Cursor Chat

Abra o Cursor e pergunte:

```
@railway-mcp-server list my Railway projects
```

Ou:

```
@railway-mcp-server show me the logs of the backend service
```

### 2. Via Terminal (Teste Manual)

```bash
# Ver projetos
railway list

# Ver serviços do projeto atual
railway status

# Ver logs
railway logs

# Ver variáveis de ambiente
railway variables
```

## 📚 Comandos Disponíveis via MCP

### Projetos

```
@railway-mcp-server list all my Railway projects
@railway-mcp-server create a new project called "test-project"
@railway-mcp-server link this directory to Railway project "chatUp"
```

### Serviços

```
@railway-mcp-server list all services in this project
@railway-mcp-server deploy the backend service
@railway-mcp-server show me the status of all services
```

### Ambientes

```
@railway-mcp-server create a new environment called "staging"
@railway-mcp-server switch to production environment
@railway-mcp-server list all environments
```

### Variáveis de Ambiente

```
@railway-mcp-server list all environment variables
@railway-mcp-server set DATABASE_URL to "postgresql://..."
@railway-mcp-server show me the value of JWT_SECRET
```

### Logs e Monitoramento

```
@railway-mcp-server show me the latest logs from backend service
@railway-mcp-server show me deployment logs
@railway-mcp-server check if the backend service is healthy
```

### Deploy

```
@railway-mcp-server deploy the current directory
@railway-mcp-server deploy from template "postgres"
@railway-mcp-server redeploy the backend service
```

## 🔐 Segurança

### ⚠️ Importante

O Railway MCP Server foi projetado para **excluir ações destrutivas**, mas ainda assim:

1. **Revise ações** antes de executar
2. **Restrinja acesso** apenas a usuários confiáveis
3. **Use em desenvolvimento** - evite em produção crítica
4. **Não compartilhe** tokens ou credenciais

### Ações Seguras (Permitidas)

- ✅ Listar projetos, serviços, ambientes
- ✅ Ver logs e status
- ✅ Fazer deploy de código
- ✅ Configurar variáveis de ambiente
- ✅ Criar novos projetos/serviços

### Ações Bloqueadas (Não Permitidas)

- ❌ Deletar projetos ou serviços
- ❌ Remover variáveis de ambiente críticas
- ❌ Modificar configurações de billing
- ❌ Revogar acessos de equipe

## 🐛 Troubleshooting

### MCP não aparece no Cursor

1. **Verificar configuração**:
   ```bash
   cat .cursor/mcp.json
   ```

2. **Verificar se npx funciona**:
   ```bash
   npx -y @railway/mcp-server --help
   ```

3. **Reiniciar Cursor**:
   - Feche completamente o Cursor
   - Abra novamente

4. **Verificar logs do Cursor**:
   - `Help` → `Toggle Developer Tools` → `Console`
   - Procure por erros relacionados a MCP

### "No linked project found"

```bash
# Linkar projeto
cd backend
railway link

# Verificar
railway status
```

### "Authentication required"

```bash
# Fazer login novamente
railway logout
railway login

# Verificar
railway whoami
```

### Erro "command not found: npx"

```bash
# Instalar Node.js >= 16
# Verificar instalação
node --version
npm --version
npx --version
```

### MCP muito lento

O MCP usa `npx` que pode ser lento na primeira execução. Para melhorar:

1. **Instalar globalmente**:
   ```bash
   npm install -g @railway/mcp-server
   ```

2. **Atualizar configuração** (`.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "railway-mcp-server": {
         "command": "railway-mcp-server"
       }
     }
   }
   ```

## 📖 Exemplos Práticos

### Exemplo 1: Deploy Rápido

```
Você: @railway-mcp-server deploy the backend service and show me the logs

AI: Executando deploy...
✅ Deploy iniciado
📝 Logs:
[build] Installing dependencies...
[build] Building application...
[deploy] Starting service...
[deploy] ✅ Service is healthy
```

### Exemplo 2: Verificar Variáveis

```
Você: @railway-mcp-server list all environment variables for backend service

AI: Variáveis de ambiente configuradas:
- DATABASE_URL: ${{Postgres.DATABASE_URL}}
- NODE_ENV: production
- PORT: 3000
- JWT_SECRET: ****** (hidden)
```

### Exemplo 3: Monitorar Serviços

```
Você: @railway-mcp-server show me the status of all services and their health

AI: Status dos serviços:
✅ Postgres (postgres): Running, Healthy
✅ Backend (backend): Running, Healthy
📊 CPU: 12%, Memory: 45%
```

## 🔗 Links Úteis

- [Railway MCP Server Docs](https://docs.railway.com/reference/mcp-server)
- [Railway CLI Docs](https://docs.railway.com/guides/cli)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Railway Dashboard](https://railway.app)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique a [documentação oficial](https://docs.railway.com/reference/mcp-server)
2. Consulte os logs do Cursor (Developer Tools)
3. Teste comandos manualmente via CLI: `railway <command>`
4. Railway Discord: [discord.gg/railway](https://discord.gg/railway)
5. GitHub Issues: [railway/mcp-server](https://github.com/railwayapp/mcp-server)

## ✅ Checklist de Configuração

- [ ] Railway CLI instalado (`railway --version`)
- [ ] Autenticado no Railway (`railway whoami`)
- [ ] MCP configurado em `.cursor/mcp.json`
- [ ] Cursor reiniciado
- [ ] Projeto linkado (`railway link`)
- [ ] MCP testado (`@railway-mcp-server list projects`)

---

**Última atualização**: Janeiro 2026  
**Versão MCP**: @railway/mcp-server (latest)  
**Status**: ✅ Experimental - Pronto para uso
