# ⚡ Configuração Completa: Electric SQL no Railway

## 🎯 Problema Identificado

**Por que Electric SQL não está rodando**:
1. Railway **NÃO suporta Docker-in-Docker** no buildpack Nixpacks
2. O script `start-with-electric.js` tenta usar Docker, mas falha silenciosamente
3. **Solução**: Criar Electric SQL como **serviço separado** no Railway

## ✅ Solução: Serviço Separado para Electric SQL

### Passo 1: Criar Serviço Electric SQL no Railway

#### Via Dashboard (Recomendado):

1. **No Railway Dashboard**, clique em **"+ New"** → **"Empty Service"**
2. Nomeie como: `electric-sql`
3. Configure:
   - **Source**: Docker Image
   - **Image**: `electricsql/electric:latest`
   - **Port**: `5133`

#### Via Railway CLI:

```bash
# Criar novo serviço com Docker image
railway add --service electric-sql --image electricsql/electric:latest

# OU criar serviço vazio e configurar depois
railway add --service electric-sql

# Depois, no Dashboard, configure:
# - Source: Docker Image
# - Image: electricsql/electric:latest
# - Port: 5133
```

### Passo 2: Configurar Variáveis de Ambiente

**⚠️ IMPORTANTE**: Configurar variáveis via **Dashboard é mais fácil** que via CLI.

#### Opção A: Via Dashboard (Recomendado)

1. No serviço **electric-sql**, vá em **Settings** → **Variables**
2. Clique em **"+ New Variable"**
3. Adicione cada variável:

No serviço **electric-sql**, configure as seguintes variáveis:

```bash
# Database connection (use service reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Logical replication (extrair do DATABASE_URL ou configurar manualmente)
# Se Railway não suportar service references, configure manualmente:
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

#### Opção B: Via CLI (Sintaxe Correta)

```bash
# Configurar variáveis usando --set (sintaxe correta)
railway variables --service electric-sql --set "DATABASE_URL=${{Postgres.DATABASE_URL}}"
railway variables --service electric-sql --set "AUTH_MODE=insecure"
railway variables --service electric-sql --set "ELECTRIC_WRITE_TO_PG_MODE=direct"
railway variables --service electric-sql --set "ELECTRIC_PORT=5133"

# Logical replication (se Railway suportar service references)
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_HOST=${{Postgres.PGHOST}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PORT=${{Postgres.PGPORT}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_USER=${{Postgres.PGUSER}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PASSWORD=${{Postgres.PGPASSWORD}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_DATABASE=${{Postgres.PGDATABASE}}"
```

**⚠️ Se Railway não suportar service references**, você precisa obter as credenciais manualmente:

1. **Obter credenciais do PostgreSQL**:
   ```bash
   railway variables --service postgres
   ```

2. **Configurar manualmente no Dashboard** (mais fácil) ou via CLI:
   ```bash
   railway variables --service electric-sql --set "DATABASE_URL=postgresql://user:password@host:port/database"
   railway variables --service electric-sql --set "LOGICAL_PUBLISHER_HOST=host"
   railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PORT=5432"
   railway variables --service electric-sql --set "LOGICAL_PUBLISHER_USER=user"
   railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PASSWORD=password"
   railway variables --service electric-sql --set "LOGICAL_PUBLISHER_DATABASE=database"
   railway variables --service electric-sql --set "AUTH_MODE=insecure"
   railway variables --service electric-sql --set "ELECTRIC_WRITE_TO_PG_MODE=direct"
   railway variables --service electric-sql --set "ELECTRIC_PORT=5133"
   ```

### Passo 3: Habilitar Logical Replication no PostgreSQL

**CRÍTICO**: O PostgreSQL precisa ter logical replication habilitado.

```bash
# Conectar ao PostgreSQL
railway connect --service postgres
```

Dentro do `psql`, execute:

```sql
-- 1. Habilitar logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- 2. Verificar se tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'users', 'keys', 'pre_keys');

-- 3. Criar publicação (após tabelas existirem)
CREATE PUBLICATION IF NOT EXISTS electric_publication 
FOR TABLE messages, users, keys, pre_keys;

-- 4. Verificar publicação
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';
```

**OU** execute o script SQL diretamente:

```bash
# Se você tem o arquivo localmente
railway connect --service postgres < backend/scripts/setup-electric-postgres-direct.sql
```

### Passo 4: Configurar Railway para o Serviço Electric

No Railway Dashboard, serviço **electric-sql**:

1. **Settings** → **Deploy**:
   - **Source**: Docker Image
   - **Image**: `electricsql/electric:latest`
   - **Port**: `5133`

2. **Settings** → **Networking**:
   - **Generate Domain** para obter URL pública
   - Anote a URL: `https://electric-sql-production-xxxx.up.railway.app`

### Passo 5: Atualizar Frontend para Usar URL do Electric SQL

No frontend (via EAS ou Railway), configure:

```bash
EXPO_PUBLIC_ELECTRIC_URL=https://electric-sql-production-xxxx.up.railway.app
```

**OU** use service reference no backend e exponha:

No **backend** Railway:
```bash
ELECTRIC_URL=${{Electric.ELECTRIC_URL}}
```

E no **frontend**:
```bash
EXPO_PUBLIC_ELECTRIC_URL=${{Backend.ELECTRIC_URL}}
```

### Passo 6: Verificar se Está Funcionando

1. **Verificar logs do Electric SQL**:
   ```bash
   railway logs --service electric-sql --follow
   ```
   Procure por: `✅ Electric SQL está rodando`

2. **Testar health check**:
   ```bash
   curl https://electric-sql-production-xxxx.up.railway.app/health
   ```
   Deve retornar: `{"status":"ok"}`

3. **Verificar publicação no PostgreSQL**:
   ```sql
   SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
   SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';
   ```

4. **Testar no frontend**:
   - Abrir app
   - Verificar logs: `✅ [useMessages] Electric SQL conectado e pronto`
   - Selecionar contato - não deve mais dar erro "Unknown expression type: undefined"

## 🔧 Troubleshooting

### ❌ Electric SQL não inicia

**Verificar**:
1. Variáveis de ambiente estão corretas?
2. `DATABASE_URL` está acessível?
3. Logical replication está habilitado no PostgreSQL?

**Logs**:
```bash
railway logs --service electric-sql --follow
```

### ❌ "Publication does not exist"

**Solução**: Criar publicação manualmente:
```sql
CREATE PUBLICATION electric_publication 
FOR TABLE messages, users, keys, pre_keys;
```

### ❌ Frontend não conecta ao Electric SQL

**Verificar**:
1. `EXPO_PUBLIC_ELECTRIC_URL` está configurada?
2. URL está acessível (teste com `curl`)?
3. CORS está configurado no Electric SQL?

## 📋 Checklist Final

- [ ] Serviço `electric-sql` criado no Railway
- [ ] Variáveis de ambiente configuradas
- [ ] Logical replication habilitado no PostgreSQL
- [ ] Publicação `electric_publication` criada
- [ ] Electric SQL está rodando (health check OK)
- [ ] Frontend configurado com `EXPO_PUBLIC_ELECTRIC_URL`
- [ ] App conecta ao Electric SQL sem erros

---

**Status**: ✅ Guia completo para configurar Electric SQL como serviço separado  
**Próximo passo**: Seguir os passos acima para configurar no Railway
