# ⚡ Configurar Electric SQL como Serviço Separado no Railway

## 🎯 Por que Serviço Separado?

Railway **NÃO suporta Docker-in-Docker** no buildpack Nixpacks. Tentar rodar Docker dentro do backend falha silenciosamente.

**Solução**: Criar um **serviço separado** para Electric SQL usando o template oficial do Railway.

## ✅ Passo 1: Criar Serviço Electric SQL no Railway

### Opção A: Via Dashboard (Recomendado)

1. **No Railway Dashboard**, clique em **"+ New"** → **"Deploy from GitHub repo"**
2. Selecione seu repositório
3. Quando perguntar qual template usar, procure por **"Electric SQL"** ou:
   - Selecione **"Empty Service"**
   - Depois configure como Docker service

### Opção B: Via Railway CLI

```bash
# Criar novo serviço com Docker image
railway add --service electric-sql --image electricsql/electric:latest

# OU criar serviço vazio
railway add --service electric-sql

# Depois, no Dashboard, configure:
# - Source: Docker Image  
# - Image: electricsql/electric:latest
# - Port: 5133
```

## ✅ Passo 2: Configurar Dockerfile para Electric SQL

Crie `backend/Dockerfile.electric`:

```dockerfile
FROM electricsql/electric:latest

# Electric SQL usa variáveis de ambiente
# Não precisa de build, apenas configuração
```

## ✅ Passo 3: Configurar Variáveis de Ambiente

No serviço **electric-sql** no Railway, configure:

```bash
# Database connection (use service reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Logical replication (extrair do DATABASE_URL ou configurar manualmente)
LOGICAL_PUBLISHER_HOST=${{Postgres.PGHOST}}
LOGICAL_PUBLISHER_PORT=${{Postgres.PGPORT}}
LOGICAL_PUBLISHER_USER=${{Postgres.PGUSER}}
LOGICAL_PUBLISHER_PASSWORD=${{Postgres.PGPASSWORD}}
LOGICAL_PUBLISHER_DATABASE=${{Postgres.PGDATABASE}}

# Electric configuration
AUTH_MODE=insecure
ELECTRIC_WRITE_TO_PG_MODE=direct
ELECTRIC_PORT=5133
```

**OU** se Railway não suportar service references, configure manualmente:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
LOGICAL_PUBLISHER_HOST=host
LOGICAL_PUBLISHER_PORT=5432
LOGICAL_PUBLISHER_USER=user
LOGICAL_PUBLISHER_PASSWORD=password
LOGICAL_PUBLISHER_DATABASE=database
AUTH_MODE=insecure
ELECTRIC_WRITE_TO_PG_MODE=direct
ELECTRIC_PORT=5133
```

## ✅ Passo 4: Configurar Railway para o Serviço Electric

No Railway, configure o serviço **electric-sql**:

1. **Source**: Docker Image
2. **Image**: `electricsql/electric:latest`
3. **Port**: `5133`
4. **Health Check**: `/health`

Ou crie `railway.electric.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.electric"
  },
  "deploy": {
    "startCommand": "",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

## ✅ Passo 5: Habilitar Logical Replication no PostgreSQL

**IMPORTANTE**: O PostgreSQL precisa ter logical replication habilitado.

```bash
# Conectar ao PostgreSQL
railway connect --service postgres

# Dentro do psql, execute:
```

```sql
-- Habilitar logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- Criar publicação (após tabelas existirem)
CREATE PUBLICATION IF NOT EXISTS electric_publication 
FOR TABLE messages, users, keys, pre_keys;

-- Verificar
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
```

## ✅ Passo 6: Atualizar Frontend para Usar URL do Serviço Electric

No frontend, configure a URL do Electric SQL:

```bash
# No Railway, serviço frontend ou via EAS
EXPO_PUBLIC_ELECTRIC_URL=https://electric-sql-production.up.railway.app
```

Ou use service reference no backend e exponha via variável:

```bash
# No backend Railway
ELECTRIC_URL=${{Electric.ELECTRIC_URL}}
```

E no frontend:
```bash
EXPO_PUBLIC_ELECTRIC_URL=${{Backend.ELECTRIC_URL}}
```

## ✅ Passo 7: Remover Script de Inicialização do Backend

Agora que Electric SQL é um serviço separado, **remova** a tentativa de iniciar via Docker do backend:

```json
// backend/railway.json
{
  "deploy": {
    "startCommand": "node dist/main.js"  // ← Remover start-with-electric.js
  }
}
```

## 🔍 Verificação

1. **Verificar se Electric SQL está rodando**:
   ```bash
   railway logs --service electric-sql --follow
   ```
   Procure por: `✅ Electric SQL está rodando`

2. **Testar health check**:
   ```bash
   curl https://electric-sql-production.up.railway.app/health
   ```

3. **Verificar publicação no PostgreSQL**:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
   ```

## 📋 Resumo

- ✅ Electric SQL como **serviço separado** no Railway
- ✅ Usa Docker image oficial `electricsql/electric:latest`
- ✅ Configurado via variáveis de ambiente
- ✅ Backend não tenta mais iniciar Electric SQL
- ✅ Frontend conecta diretamente ao serviço Electric SQL

---

**Status**: ✅ Configuração para serviço separado  
**Próximo passo**: Criar serviço no Railway e configurar variáveis
