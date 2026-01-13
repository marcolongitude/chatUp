# 🚂 Railway - Setup Completo de 3 Serviços

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React Native)                  │
│                    Expo + Firestore + E2E                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─────────────┬─────────────┬──────────────┐
                   │             │             │              │
                   ▼             ▼             ▼              ▼
         ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
         │  Firebase   │  │ Backend  │  │ Electric │  │PostgreSQL│
         │ (Firestore) │  │ (NestJS) │  │   SQL    │  │          │
         └─────────────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
                               │             │             │
                               │             └─────────────┤
                               └───────────────────────────┘
                                      DATABASE_URL
```

### Serviços na Railway

1. **PostgreSQL** - Banco de dados principal
   - Porta: 5432
   - Configurado com logical replication
   - Extensão uuid-ossp

2. **Backend (NestJS)** - API REST + WebSockets
   - Porta: 3000
   - TypeORM + Migrations
   - JWT Authentication
   - Signal Protocol E2E

3. **Electric SQL** - Sincronização em tempo real
   - Porta: 5133
   - Logical replication do PostgreSQL
   - WebSocket para clientes

## 🚀 Passo a Passo - Deploy na Railway

### Pré-requisitos

- [x] Conta Railway ativa
- [x] Railway CLI instalado e autenticado
- [x] Código commitado no Git
- [x] Dockerfiles criados (✅ já criados!)

### Fase 1: Criar Projeto Railway

#### 1.1 Via Railway Dashboard

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Empty Project"**
4. Nomeie: `chatup` ou `chatup-production`

#### 1.2 Via Railway CLI

```bash
cd backend
railway init
# Selecione: Create new project
# Nome: chatup
```

### Fase 2: Deploy PostgreSQL

#### 2.1 Criar Serviço PostgreSQL

**Via Dashboard**:

1. No projeto, clique em **"+ New"**
2. Selecione **"GitHub Repo"**
3. Escolha o repositório `chatUp`
4. Configure:
   - **Service Name**: `postgres`
   - **Root Directory**: `backend`
   - **Railway Config**: Usar `railway.postgres.json`

**Via CLI**:

```bash
cd backend

# Deploy com Dockerfile específico
railway up --service postgres --dockerfile Dockerfile.postgres
```

#### 2.2 Configurar Variáveis de Ambiente - PostgreSQL

No Railway Dashboard → Postgres → Variables:

```bash
# Credenciais do banco
POSTGRES_USER=admin
POSTGRES_PASSWORD=<gerar senha forte>
POSTGRES_DB=chatup

# Configurações de replicação (já no Dockerfile)
# Estas são automáticas via Dockerfile
```

**Gerar senha forte**:

```bash
openssl rand -base64 32
```

#### 2.3 Obter DATABASE_URL

Após deploy, a Railway gera automaticamente:

```
DATABASE_URL=postgresql://admin:password@postgres.railway.internal:5432/chatup
```

**Importante**: Anote o `RAILWAY_PRIVATE_DOMAIN` do serviço PostgreSQL.

### Fase 3: Deploy Backend (NestJS)

#### 3.1 Criar Serviço Backend

**Via Dashboard**:

1. No projeto, clique em **"+ New"**
2. Selecione **"GitHub Repo"**
3. Escolha o repositório `chatUp`
4. Configure:
   - **Service Name**: `backend`
   - **Root Directory**: `backend`
   - **Railway Config**: Usar `railway.backend.json`

**Via CLI**:

```bash
cd backend

# Deploy com Dockerfile específico
railway up --service backend --dockerfile Dockerfile.backend
```

#### 3.2 Configurar Variáveis de Ambiente - Backend

No Railway Dashboard → Backend → Variables:

```bash
# Conexão com PostgreSQL (referência ao serviço)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Aplicação
NODE_ENV=production
PORT=3000

# Autenticação JWT
JWT_SECRET=<gerar chave secreta>
JWT_EXPIRES_IN=7d

# Electric SQL (referência ao serviço)
ELECTRIC_URL=${{Electric.ELECTRIC_URL}}
ELECTRIC_HOST=electric.railway.internal
ELECTRIC_PORT=5133
```

**Gerar JWT_SECRET**:

```bash
openssl rand -base64 32
```

#### 3.3 Executar Migrations

Após o backend estar rodando:

```bash
# Via Railway CLI
railway run --service backend npm run migration:run

# Ou via SSH
railway ssh --service backend
npm run migration:run
exit
```

### Fase 4: Deploy Electric SQL

#### 4.1 Criar Serviço Electric

**Via Dashboard**:

1. No projeto, clique em **"+ New"**
2. Selecione **"GitHub Repo"**
3. Escolha o repositório `chatUp`
4. Configure:
   - **Service Name**: `electric`
   - **Root Directory**: `backend`
   - **Railway Config**: Usar `railway.electric.json`

**Via CLI**:

```bash
cd backend

# Deploy com Dockerfile específico
railway up --service electric --dockerfile Dockerfile.electric
```

#### 4.2 Configurar Variáveis de Ambiente - Electric

No Railway Dashboard → Electric → Variables:

```bash
# Conexão com PostgreSQL (referência ao serviço)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Configuração de autenticação
AUTH_MODE=insecure

# Configuração do publisher (PostgreSQL)
LOGICAL_PUBLISHER_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
LOGICAL_PUBLISHER_PORT=5432
LOGICAL_PUBLISHER_USER=admin
LOGICAL_PUBLISHER_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
LOGICAL_PUBLISHER_DATABASE=chatup

# Porta do Electric
PORT=5133
```

### Fase 5: Criar Publication no PostgreSQL

Após as migrations criarem as tabelas, crie a publication:

```bash
# Conectar ao PostgreSQL
railway connect postgres --service postgres

# No psql, executar:
CREATE PUBLICATION IF NOT EXISTS electric_publication 
FOR TABLE messages, users, keys, pre_keys;

# Verificar
\dRp+

# Sair
\q
```

### Fase 6: Verificação e Testes

#### 6.1 Verificar Status dos Serviços

```bash
# Ver todos os serviços
railway status

# Ver logs de cada serviço
railway logs --service postgres
railway logs --service backend
railway logs --service electric
```

#### 6.2 Testar PostgreSQL

```bash
# Conectar ao banco
railway connect postgres --service postgres

# Verificar tabelas
\dt

# Deve mostrar:
# - users
# - messages
# - keys
# - pre_keys

# Verificar publication
\dRp+

# Sair
\q
```

#### 6.3 Testar Backend

```bash
# Obter URL do backend
railway status --service backend

# Testar health check
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

#### 6.4 Testar Electric SQL

```bash
# Obter URL do Electric
railway status --service electric

# Testar health check
curl https://seu-electric.railway.app/health
```

#### 6.5 Testar Integração Completa

```bash
# Registrar usuário
curl -X POST https://seu-backend.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test User"
  }'

# Login
curl -X POST https://seu-backend.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

## 📊 Resumo das Configurações

### Estrutura de Arquivos Criados

```
backend/
├── Dockerfile.postgres          # ✅ PostgreSQL com logical replication
├── Dockerfile.backend           # ✅ NestJS otimizado multi-stage
├── Dockerfile.electric          # ✅ Electric SQL
├── railway.postgres.json        # ✅ Config Railway PostgreSQL
├── railway.backend.json         # ✅ Config Railway Backend
├── railway.electric.json        # ✅ Config Railway Electric
├── electric/
│   ├── init-postgres.sql        # ✅ Script de inicialização (corrigido)
│   └── schema.sql               # Schema Electric SQL
└── docker-compose.yml           # Para desenvolvimento local
```

### Variáveis de Ambiente por Serviço

#### PostgreSQL

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `POSTGRES_USER` | `admin` | Usuário do banco |
| `POSTGRES_PASSWORD` | `<senha forte>` | Senha do banco |
| `POSTGRES_DB` | `chatup` | Nome do database |

#### Backend

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexão com PostgreSQL |
| `NODE_ENV` | `production` | Ambiente |
| `PORT` | `3000` | Porta da aplicação |
| `JWT_SECRET` | `<chave secreta>` | Chave JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiração do token |
| `ELECTRIC_URL` | `${{Electric.ELECTRIC_URL}}` | URL do Electric |

#### Electric SQL

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexão com PostgreSQL |
| `AUTH_MODE` | `insecure` | Modo de autenticação |
| `LOGICAL_PUBLISHER_HOST` | `${{Postgres.RAILWAY_PRIVATE_DOMAIN}}` | Host do PostgreSQL |
| `LOGICAL_PUBLISHER_PORT` | `5432` | Porta do PostgreSQL |
| `LOGICAL_PUBLISHER_USER` | `admin` | Usuário do PostgreSQL |
| `LOGICAL_PUBLISHER_PASSWORD` | `${{Postgres.POSTGRES_PASSWORD}}` | Senha do PostgreSQL |
| `LOGICAL_PUBLISHER_DATABASE` | `chatup` | Nome do database |
| `PORT` | `5133` | Porta do Electric |

### URLs dos Serviços

Após deploy, você terá:

```
PostgreSQL:  postgres.railway.internal:5432
Backend:     https://backend-xxx.railway.app
Electric:    https://electric-xxx.railway.app
```

## 🐛 Troubleshooting

### PostgreSQL não inicia

**Erro**: `wal_level not set to logical`

**Solução**: O Dockerfile já configura isso. Verifique se está usando `Dockerfile.postgres`.

### Backend não conecta ao PostgreSQL

**Erro**: `ECONNREFUSED` ou `Connection timeout`

**Solução**:

1. Verifique se `DATABASE_URL` está configurada
2. Verifique se usa referência: `${{Postgres.DATABASE_URL}}`
3. Verifique se PostgreSQL está rodando

### Electric não inicia

**Erro**: `Publication not found`

**Solução**:

1. Conecte ao PostgreSQL: `railway connect postgres`
2. Crie a publication manualmente (veja Fase 5)

### Migrations falham

**Erro**: `relation already exists`

**Solução**:

```bash
# Conectar ao PostgreSQL
railway connect postgres

# Dropar e recriar (⚠️ APAGA DADOS!)
DROP DATABASE chatup;
CREATE DATABASE chatup;

# Sair e rodar migrations
\q
railway run --service backend npm run migration:run
```

## 📚 Scripts Úteis

### Script de Deploy Completo

```bash
#!/bin/bash
# deploy-all-services.sh

echo "🚀 Deploying all services to Railway..."

cd backend

# Deploy PostgreSQL
echo "1️⃣ Deploying PostgreSQL..."
railway up --service postgres --dockerfile Dockerfile.postgres --detach

# Aguardar PostgreSQL estar pronto
sleep 30

# Deploy Backend
echo "2️⃣ Deploying Backend..."
railway up --service backend --dockerfile Dockerfile.backend --detach

# Aguardar Backend estar pronto
sleep 30

# Executar migrations
echo "3️⃣ Running migrations..."
railway run --service backend npm run migration:run

# Deploy Electric
echo "4️⃣ Deploying Electric..."
railway up --service electric --dockerfile Dockerfile.electric --detach

echo "✅ All services deployed!"
echo ""
echo "Next steps:"
echo "1. Create publication: railway connect postgres"
echo "2. Test services: ./scripts/test-railway-services.sh"
```

### Script de Teste

```bash
#!/bin/bash
# test-railway-services.sh

echo "🧪 Testing Railway services..."

# Obter URLs
BACKEND_URL=$(railway status --service backend --json | jq -r '.url')
ELECTRIC_URL=$(railway status --service electric --json | jq -r '.url')

# Testar Backend
echo "Testing Backend..."
curl -f "$BACKEND_URL/health" || echo "❌ Backend health check failed"

# Testar Electric
echo "Testing Electric..."
curl -f "$ELECTRIC_URL/health" || echo "❌ Electric health check failed"

echo "✅ Tests completed!"
```

## ✅ Checklist de Deploy

### Preparação

- [x] Dockerfiles criados
- [x] Configurações Railway criadas
- [x] Código commitado no Git
- [x] Railway CLI instalado

### Deploy

- [ ] Projeto Railway criado
- [ ] PostgreSQL deployado
- [ ] Backend deployado
- [ ] Electric deployado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] Publication criada

### Verificação

- [ ] PostgreSQL respondendo
- [ ] Backend health check OK
- [ ] Electric health check OK
- [ ] Tabelas criadas no banco
- [ ] Publication configurada
- [ ] Testes de integração passando

## 🔗 Links Úteis

- [Railway Docs](https://docs.railway.com/)
- [Electric SQL Docs](https://electric-sql.com/docs)
- [NestJS Deployment](https://docs.nestjs.com/faq/deployment)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

---

**Última atualização**: Janeiro 2026  
**Status**: ✅ Pronto para deploy  
**Próximo passo**: Executar deploy dos 3 serviços na Railway
