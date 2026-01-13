# ✅ Comando Correto: Criar Serviço Electric SQL no Railway

## ❌ Comando Errado

```bash
railway service create electric-sql  # ❌ ERRADO
```

## ✅ Comando Correto

```bash
# Opção 1: Criar serviço com Docker image diretamente
railway add --service electric-sql --image electricsql/electric:latest

# Opção 2: Criar serviço vazio e configurar depois
railway add --service electric-sql
```

## 📋 Passos Completos

### Via CLI:

```bash
# 1. Criar serviço
railway add --service electric-sql --image electricsql/electric:latest

# 2. Configurar variáveis de ambiente (sintaxe correta)
railway variables --service electric-sql --set "DATABASE_URL=${{Postgres.DATABASE_URL}}"
railway variables --service electric-sql --set "AUTH_MODE=insecure"
railway variables --service electric-sql --set "ELECTRIC_WRITE_TO_PG_MODE=direct"
railway variables --service electric-sql --set "ELECTRIC_PORT=5133"

# 3. Configurar logical replication (se Railway não suportar service references)
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_HOST=${{Postgres.PGHOST}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PORT=${{Postgres.PGPORT}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_USER=${{Postgres.PGUSER}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_PASSWORD=${{Postgres.PGPASSWORD}}"
railway variables --service electric-sql --set "LOGICAL_PUBLISHER_DATABASE=${{Postgres.PGDATABASE}}"
```

### Via Dashboard (Mais Fácil):

1. Railway Dashboard → "+ New" → "Empty Service"
2. Nome: `electric-sql`
3. Settings → Deploy:
   - Source: Docker Image
   - Image: `electricsql/electric:latest`
   - Port: `5133`
4. Settings → Variables → Adicionar todas as variáveis

## 🔍 Verificar

```bash
# Ver serviços
railway status

# Ver logs
railway logs --service electric-sql --follow

# Testar health
curl https://electric-sql-production-xxxx.up.railway.app/health
```
