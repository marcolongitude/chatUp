# ✅ Comandos Corretos: Railway Variables

## ❌ Sintaxe Errada

```bash
railway variables set KEY=VALUE --service electric-sql  # ❌ ERRADO
```

## ✅ Sintaxe Correta

```bash
railway variables --service electric-sql --set "KEY=VALUE"
```

## 📋 Exemplos Completos

### Configurar Variáveis do Electric SQL

```bash
# Database connection
railway variables --service electric-sql --set "DATABASE_URL=${{Postgres.DATABASE_URL}}"

# Electric configuration
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

### Ver Variáveis

```bash
# Ver todas as variáveis do serviço
railway variables --service electric-sql

# Ver em formato JSON
railway variables --service electric-sql --json

# Ver em formato KV
railway variables --service electric-sql --kv
```

### Configurar Múltiplas Variáveis de Uma Vez

```bash
railway variables --service electric-sql \
  --set "DATABASE_URL=${{Postgres.DATABASE_URL}}" \
  --set "AUTH_MODE=insecure" \
  --set "ELECTRIC_WRITE_TO_PG_MODE=direct" \
  --set "ELECTRIC_PORT=5133"
```

## 💡 Dica: Use Dashboard

**Configurar via Dashboard é mais fácil**:
1. Railway Dashboard → Serviço `electric-sql`
2. Settings → Variables
3. "+ New Variable"
4. Adicione cada variável manualmente

## 🔍 Verificar

```bash
# Ver todas as variáveis configuradas
railway variables --service electric-sql
```
