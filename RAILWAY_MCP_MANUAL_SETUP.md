# 🔧 Configuração Manual do Railway MCP

## ✅ Status Atual

- ✅ Railway CLI instalado: `railway 4.23.1`
- ✅ Autenticado: `MarcoAurelio (marcocpdti@gmail.com)`
- ✅ Node.js instalado: `v23.8.0`
- ⚠️ Arquivo `.cursor/mcp.json` já existe

## 📝 Passo a Passo Manual

### 1. Adicionar Railway MCP ao arquivo existente

Você precisa **adicionar** a configuração do Railway MCP ao arquivo `.cursor/mcp.json` existente.

**Abra o arquivo**:
```bash
code .cursor/mcp.json
# ou
nano .cursor/mcp.json
```

**Adicione a seguinte entrada** ao objeto `mcpServers`:

```json
{
  "mcpServers": {
    "railway-mcp-server": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    },
    // ... outros MCP servers existentes ...
  }
}
```

**Exemplo completo** (se o arquivo estiver vazio ou só tiver outros servers):

```json
{
  "mcpServers": {
    "railway-mcp-server": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    },
    "user-terminal-hook": {
      "command": "...",
      "args": ["..."]
    },
    "user-mysql-baratheon": {
      "command": "...",
      "args": ["..."]
    },
    "project-0-chatUp-firebase": {
      "command": "...",
      "args": ["..."]
    }
  }
}
```

### 2. Linkar Projeto Railway

```bash
# Ir para o diretório backend
cd backend

# Linkar ao projeto Railway
railway link

# Quando solicitado, selecione:
# 1. Workspace: MarcoAurelio
# 2. Projeto: (escolha entre "terrific-balance" ou "courageous-liberation")
# 3. Environment: production
```

**Verificar link**:
```bash
railway status
```

### 3. Reiniciar Cursor

- Feche completamente o Cursor
- Abra novamente

### 4. Testar MCP Railway

No Cursor Chat, digite:

```
@railway-mcp-server list my Railway projects
```

Ou:

```
@railway-mcp-server show me the status of my services
```

## 🧪 Testes Rápidos

### Via Cursor Chat

```
@railway-mcp-server list projects
@railway-mcp-server show logs
@railway-mcp-server list environment variables
```

### Via Terminal (para comparar)

```bash
railway list
railway logs
railway variables
```

## 🔍 Verificação

### 1. Verificar se MCP está carregado

1. Abra Cursor
2. Vá em `Settings` → `Features` → `MCP Servers`
3. Procure por `railway-mcp-server`
4. Deve estar listado e ativo

### 2. Verificar projeto linkado

```bash
cd backend
railway status
```

**Resultado esperado**:
```
Project: [nome-do-projeto]
Environment: production
Service: backend
```

### 3. Testar comando Railway

```bash
railway whoami
```

**Resultado esperado**:
```
Logged in as MarcoAurelio (marcocpdti@gmail.com) 👋
```

## 🐛 Troubleshooting

### MCP não aparece no Cursor

1. Verifique se adicionou corretamente ao `.cursor/mcp.json`
2. Verifique a sintaxe JSON (use um validador online se necessário)
3. Reinicie o Cursor completamente
4. Verifique logs: `Help` → `Toggle Developer Tools` → `Console`

### "No linked project found"

```bash
cd backend
railway link
railway status
```

### Erro ao executar npx

```bash
# Testar manualmente
npx -y @railway/mcp-server --help

# Se falhar, instalar globalmente
npm install -g @railway/mcp-server

# Atualizar .cursor/mcp.json para usar comando global:
{
  "mcpServers": {
    "railway-mcp-server": {
      "command": "railway-mcp-server"
    }
  }
}
```

## 📋 Checklist

- [ ] `.cursor/mcp.json` atualizado com railway-mcp-server
- [ ] Sintaxe JSON válida
- [ ] Cursor reiniciado
- [ ] Projeto linkado (`railway link`)
- [ ] Status verificado (`railway status`)
- [ ] MCP testado no Cursor Chat
- [ ] Comandos funcionando

## 🎯 Qual Projeto Linkar?

Você tem dois projetos:
- `terrific-balance`
- `courageous-liberation`

**Para descobrir qual é o chatUp**:

```bash
# Listar projetos com detalhes
railway list

# Ou tentar linkar e ver os serviços
cd backend
railway link
# Selecione um projeto
railway status
# Veja se tem os serviços: Postgres, Backend
```

Se não for o correto, deslinke e tente o outro:

```bash
railway unlink
railway link
```

## 📞 Suporte

- [Railway MCP Docs](https://docs.railway.com/reference/mcp-server)
- [Railway CLI Docs](https://docs.railway.com/guides/cli)
- Consulte: `RAILWAY_MCP_SETUP.md` para guia completo

---

**Próximo passo**: Adicione a configuração ao `.cursor/mcp.json` e reinicie o Cursor!
