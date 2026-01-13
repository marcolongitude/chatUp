# 🐳 Railway Docker Deploy - Quick Start

## 📦 Arquivos Criados

```
backend/
├── Dockerfile.postgres          # PostgreSQL com logical replication
├── Dockerfile.backend           # NestJS multi-stage otimizado
├── Dockerfile.electric          # Electric SQL
├── railway.postgres.json        # Config Railway PostgreSQL
├── railway.backend.json         # Config Railway Backend  
├── railway.electric.json        # Config Railway Electric
└── electric/
    └── init-postgres.sql        # Script inicialização (corrigido)
```

## 🚀 Deploy Rápido

### Opção 1: Script Automático (Recomendado)

```bash
./scripts/deploy-railway-services.sh
```

Escolha a opção 1 para deploy completo dos 3 serviços.

### Opção 2: Manual via Railway CLI

```bash
cd backend

# 1. Deploy PostgreSQL
railway up --service postgres --dockerfile Dockerfile.postgres

# 2. Deploy Backend
railway up --service backend --dockerfile Dockerfile.backend

# 3. Executar migrations
railway run --service backend npm run migration:run

# 4. Deploy Electric
railway up --service electric --dockerfile Dockerfile.electric
```

### Opção 3: Via Railway Dashboard

1. Acesse [railway.app](https://railway.app)
2. Crie 3 serviços do mesmo repositório GitHub
3. Configure cada um:
   - **Postgres**: Root Dir = `backend`, Dockerfile = `Dockerfile.postgres`
   - **Backend**: Root Dir = `backend`, Dockerfile = `Dockerfile.backend`
   - **Electric**: Root Dir = `backend`, Dockerfile = `Dockerfile.electric`

## ⚙️ Variáveis de Ambiente

### PostgreSQL

```bash
POSTGRES_USER=admin
POSTGRES_PASSWORD=<gerar: openssl rand -base64 32>
POSTGRES_DB=chatup
```

### Backend

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
JWT_SECRET=<gerar: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
```

### Electric

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_MODE=insecure
LOGICAL_PUBLISHER_HOST=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
LOGICAL_PUBLISHER_PORT=5432
LOGICAL_PUBLISHER_USER=admin
LOGICAL_PUBLISHER_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
LOGICAL_PUBLISHER_DATABASE=chatup
PORT=5133
```

## ✅ Verificação

```bash
# Testar todos os serviços
./scripts/test-railway-services.sh

# Ver logs
railway logs --service postgres
railway logs --service backend
railway logs --service electric

# Testar health checks
curl https://seu-backend.railway.app/health
```

## 📚 Documentação Completa

- **[RAILWAY_3_SERVICES_SETUP.md](../RAILWAY_3_SERVICES_SETUP.md)** - Guia completo passo a passo
- **[RAILWAY_SETUP.md](RAILWAY_SETUP.md)** - Setup geral Railway
- **[DATABASE_TROUBLESHOOTING.md](DATABASE_TROUBLESHOOTING.md)** - Troubleshooting

## 🆘 Problemas Comuns

### "Publication not found"

```bash
railway connect postgres --service postgres
# No psql:
CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
```

### "Cannot connect to database"

Verifique se `DATABASE_URL` usa referência: `${{Postgres.DATABASE_URL}}`

### "Migrations failed"

```bash
railway run --service backend npm run migration:run
```

---

**Status**: ✅ Pronto para deploy  
**Próximo passo**: `./scripts/deploy-railway-services.sh`
