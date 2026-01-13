# 🔍 Relatório de Diagnóstico Railway - ChatUp

**Data**: 13 de Janeiro de 2026  
**Projeto**: terrific-balance  
**Status**: ⚠️ Serviço Backend não encontrado ou não linkado

---

## 📊 Situação Atual

### ✅ O que está funcionando

1. **Railway CLI**: Instalado e autenticado
   - Versão: `railway 4.23.1`
   - Usuário: `MarcoAurelio (marcocpdti@gmail.com)`

2. **PostgreSQL**: Rodando e saudável
   - Projeto: `terrific-balance`
   - Environment: `production`
   - Host: `adaptable-wholeness.railway.internal`
   - Database: `chatup`
   - User: `admin`
   - Port: `5432`

### ❌ Problemas Identificados

1. **Serviço Backend não encontrado**
   - O diretório está linkado ao serviço `postgres`
   - Não há serviço `backend` visível/linkado

2. **Tabelas não existem no PostgreSQL**
   - Erro nos logs: `relation "messages" does not exist`
   - Migrations não foram executadas
   - Script `init-electric.sql` está tentando criar publication para tabelas inexistentes

3. **Electric SQL causando erro**
   - Arquivo `/docker-entrypoint-initdb.d/init-electric.sql` está sendo executado
   - Tentando criar publication antes das tabelas existirem

---

## 🎯 Plano de Ação

### Opção 1: Verificar se Backend já existe (Recomendado)

O serviço backend pode já existir mas não estar linkado. Vamos verificar:

#### Passo 1: Ver todos os serviços do projeto

```bash
# Acesse o Railway Dashboard
# URL: https://railway.app

# Ou use o CLI para ver informações do projeto
railway status
```

#### Passo 2: Verificar no Dashboard

1. Acesse [railway.app](https://railway.app)
2. Selecione projeto: **terrific-balance**
3. Verifique quais serviços existem:
   - ✅ Postgres (já existe)
   - ❓ Backend/chatup-backend (verificar)
   - ❓ Electric (deve ser removido - veja RAILWAY_CLEANUP.md)

#### Passo 3: Se Backend existe, linkar a ele

**Via arquivo de configuração** (mais fácil):

```bash
cd backend

# Criar arquivo que indica qual serviço usar
echo "backend" > .railway-service

# Ou se o nome for diferente
echo "chatup-backend" > .railway-service

# Verificar
railway status
```

**Via Railway CLI** (alternativa):

```bash
# Isso requer interação manual
railway link --service backend
```

### Opção 2: Criar Novo Serviço Backend

Se o serviço backend NÃO existe, você precisa criá-lo:

#### Via Railway Dashboard (Recomendado)

1. **Acesse Railway**:
   - URL: https://railway.app
   - Projeto: `terrific-balance`

2. **Criar novo serviço**:
   - Clique em **"+ New"**
   - Selecione **"GitHub Repo"**
   - Escolha o repositório: `chatUp`
   - Configure:
     - **Root Directory**: `backend`
     - **Branch**: `refatorar-app` (ou `main`)

3. **Configurar variáveis de ambiente**:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=<gerar com: openssl rand -base64 32>
   JWT_EXPIRES_IN=7d
   ```

4. **Deploy automático**:
   - Railway detectará `railway.json`
   - Fará build com Nixpacks
   - Executará migrations automaticamente (se `NODE_ENV=production`)

#### Via Railway CLI

```bash
cd backend

# Criar novo serviço (requer interação)
railway up

# Ou fazer deploy direto
railway up --service backend
```

---

## 🔧 Correções Necessárias

### 1. Remover Electric SQL (Urgente)

O arquivo `init-electric.sql` está causando erros. Siga o guia:

```bash
# Ver guia completo
cat backend/RAILWAY_CLEANUP.md

# Resumo:
# 1. Remover serviço Electric SQL da Railway (se existir)
# 2. Remover arquivo init-electric.sql do PostgreSQL
```

**Como remover init-electric.sql do PostgreSQL**:

```bash
# Conectar ao PostgreSQL
railway connect postgres

# No psql, verificar se há init script
\! ls /docker-entrypoint-initdb.d/

# Remover (se possível) ou recriar banco
# ATENÇÃO: Isso apaga todos os dados!
DROP DATABASE chatup;
CREATE DATABASE chatup;
```

**Alternativa mais segura**: Recriar serviço PostgreSQL limpo

1. Railway Dashboard → Postgres → Settings → Delete Service
2. Criar novo: + New → Database → PostgreSQL
3. Reconfigurar DATABASE_URL no backend

### 2. Executar Migrations

Depois que o backend estiver rodando:

```bash
# Via Railway CLI
railway run npm run migration:run

# Ou via SSH (se disponível)
railway ssh
npm run migration:run
```

### 3. Configurar Variáveis de Ambiente

**Variáveis obrigatórias no serviço Backend**:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Referência ao PostgreSQL |
| `NODE_ENV` | `production` | Ambiente de produção |
| `PORT` | `3000` | Porta da aplicação |
| `JWT_SECRET` | `<gerar>` | Chave secreta JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiração do token |

**Gerar JWT_SECRET**:

```bash
openssl rand -base64 32
```

---

## 📝 Checklist de Resolução

### Fase 1: Identificação

- [x] Railway CLI configurado
- [x] PostgreSQL rodando
- [ ] Serviço Backend identificado
- [ ] Variáveis de ambiente verificadas

### Fase 2: Configuração

- [ ] Backend linkado ou criado
- [ ] DATABASE_URL configurada
- [ ] JWT_SECRET configurada
- [ ] NODE_ENV=production configurada
- [ ] Electric SQL removido

### Fase 3: Deploy e Migrations

- [ ] Backend deployado com sucesso
- [ ] Migrations executadas
- [ ] Tabelas criadas no PostgreSQL
- [ ] Health check respondendo

### Fase 4: Verificação

- [ ] Backend conectando ao PostgreSQL
- [ ] Logs sem erros
- [ ] API respondendo
- [ ] Testes básicos funcionando

---

## 🧪 Testes de Verificação

### 1. Verificar Backend está rodando

```bash
# Ver logs
railway logs --service backend

# Verificar status
railway status
```

### 2. Testar Health Check

```bash
# Obter URL do backend
railway status

# Testar
curl https://seu-backend.railway.app/health
```

**Resposta esperada**:

```json
{
  "status": "ok",
  "timestamp": "2026-01-13T...",
  "service": "chatup-backend"
}
```

### 3. Verificar Conexão com Banco

```bash
# Conectar ao PostgreSQL
railway connect postgres

# Verificar tabelas
\dt

# Deve mostrar:
# - users
# - messages
# - keys
# - pre_keys
```

### 4. Testar Endpoint de Registro

```bash
curl -X POST https://seu-backend.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test User"
  }'
```

---

## 🆘 Troubleshooting

### Erro: "No linked project found"

```bash
cd backend
railway link
railway status
```

### Erro: "Service not found"

O serviço backend não existe. Crie via Dashboard (veja Opção 2 acima).

### Erro: "Cannot connect to database"

1. Verificar DATABASE_URL está configurada
2. Verificar PostgreSQL está rodando
3. Verificar SSL está habilitado (já corrigido no código)

### Erro: "relation does not exist"

Migrations não foram executadas:

```bash
railway run npm run migration:run
```

---

## 📚 Documentação de Referência

- **[RAILWAY_SETUP.md](backend/RAILWAY_SETUP.md)** - Setup completo passo a passo
- **[RAILWAY_CLEANUP.md](backend/RAILWAY_CLEANUP.md)** - Remover Electric SQL
- **[DATABASE_TROUBLESHOOTING.md](backend/DATABASE_TROUBLESHOOTING.md)** - Troubleshooting detalhado
- **[SECURITY_FIX.md](SECURITY_FIX.md)** - Correção vulnerabilidade React

---

## 🎯 Próximos Passos Imediatos

1. **Verificar se backend existe**:
   ```bash
   # Acesse railway.app e veja os serviços do projeto terrific-balance
   ```

2. **Se backend existe**:
   ```bash
   cd backend
   echo "backend" > .railway-service  # ou nome correto do serviço
   railway status
   railway logs
   ```

3. **Se backend NÃO existe**:
   - Acesse Railway Dashboard
   - Crie novo serviço do GitHub repo
   - Configure variáveis de ambiente
   - Aguarde deploy

4. **Após backend rodando**:
   ```bash
   railway run npm run migration:run
   railway logs
   curl https://seu-backend.railway.app/health
   ```

---

**Status**: ⏳ Aguardando verificação se serviço backend existe  
**Ação Requerida**: Verificar Railway Dashboard ou criar novo serviço backend

