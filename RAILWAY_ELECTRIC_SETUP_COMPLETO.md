# ⚡ Configuração Completa: Electric SQL no Railway

## ✅ O que foi Configurado

### 1. Backend (`backend/scripts/start-with-electric.js`)

-   ✅ Parse automático do `DATABASE_URL` para extrair credenciais
-   ✅ Configuração automática de logical replication
-   ✅ Health check melhorado (15 tentativas, 30 segundos)
-   ✅ Logs informativos
-   ✅ Tratamento de erros melhorado

### 2. Migrations e Scripts SQL

-   ✅ `backend/electric/migrations/001-enable-logical-replication.sql` - Habilita logical replication
-   ✅ `backend/scripts/setup-electric-postgres.sql` - Script completo para configurar PostgreSQL
-   ✅ `backend/scripts/verify-electric-setup.sh` - Script de verificação

### 3. Frontend

-   ✅ `useLiveQuery` reativado no `useMessages.ts`
-   ✅ Query completa restaurada

## 🚀 Passos para Configurar no Railway

### Passo 1: Configurar Variáveis de Ambiente

No Railway, serviço **backend**, adicione/verifique:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
ELECTRIC_PORT=5133
AUTH_MODE=insecure
```

**Nota**: O script extrai automaticamente os parâmetros de logical replication do `DATABASE_URL`.

### Passo 2: Habilitar Logical Replication no PostgreSQL

**IMPORTANTE**: O PostgreSQL precisa ter logical replication habilitado.

#### Opção A: Via Railway Dashboard

1. Acesse o serviço PostgreSQL no Railway
2. Vá em **Settings** → **Variables**
3. Adicione variável de ambiente (se suportado) ou use script SQL

#### Opção B: Via Railway CLI (Recomendado)

```bash
# 1. Conectar ao PostgreSQL (isso abre um shell psql)
railway connect --service postgres

# 2. Dentro do psql, execute os comandos SQL diretamente:
```

Depois, dentro do prompt `psql`, execute:

```sql
-- Habilitar logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- Verificar se tabelas existem e criar publicação
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
      CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
      RAISE NOTICE '✅ Publication electric_publication criada';
    ELSE
      RAISE NOTICE 'ℹ️  Publication electric_publication já existe';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Tabelas ainda não existem. Execute após TypeORM criar as tabelas.';
  END IF;
END $$;
```

**OU** execute o script SQL diretamente (fora do psql):

```bash
# Se você tem acesso ao arquivo localmente
railway connect --service postgres < backend/scripts/setup-electric-postgres.sql
```

#### Opção C: Manualmente (Dentro do psql)

Quando você executa `railway connect --service postgres`, você entra no prompt `psql`. Execute os comandos SQL diretamente:

```sql
-- 1. Habilitar logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- 2. Verificar configuração atual
SELECT name, setting, source
FROM pg_settings
WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');

-- ⚠️ ATENÇÃO: Mudanças em wal_level podem requerer RESTART do PostgreSQL
-- No Railway, isso pode ser feito via dashboard ou suporte
-- Se necessário, entre em contato com suporte do Railway para restart
```

### Passo 3: Criar Publicação (Após Tabelas Existirem)

Após o backend criar as tabelas (via TypeORM `synchronize: true`), execute no `psql`:

```sql
-- Criar publicação para Electric SQL
CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;

-- Verificar publicação
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';
```

**OU** use o script completo `setup-electric-postgres-direct.sql` que já inclui verificação de tabelas.

### Passo 4: Fazer Deploy do Backend

```bash
# Fazer push das alterações
git add .
git commit -m "Configure Electric SQL for Railway"
git push

# Railway vai fazer deploy automaticamente
# Ou via CLI:
railway up --service backend
```

### Passo 5: Verificar se Electric SQL Está Rodando

```bash
# Ver logs do backend
railway logs --service backend

# Procurar por:
# - "✅ Electric SQL está rodando na porta 5133"
# - "🐳 Docker encontrado, iniciando Electric SQL via Docker..."
# - Erros relacionados ao Docker ou Electric SQL
```

### Passo 6: Testar Endpoint do Electric SQL

```bash
# Via Railway CLI
railway connect --service backend
curl http://localhost:5133/health

# Ou diretamente (se porta estiver exposta)
curl https://backend-production-38c9.up.railway.app:5133/health
```

## 🔍 Troubleshooting

### Problema 1: Electric SQL não inicia

**Sintomas**: Logs mostram "Docker não disponível" ou erro ao iniciar

**Soluções**:

1. Verificar se Railway tem Docker disponível (pode não ter)
2. Se não tiver Docker, considerar usar Electric SQL como serviço separado
3. Verificar se `DATABASE_URL` está configurada corretamente

### Problema 2: "Unknown expression type: undefined" no frontend

**Sintomas**: Erro ao tentar usar `useLiveQuery`

**Soluções**:

1. Verificar se Electric SQL está rodando: `curl http://localhost:5133/health`
2. Verificar se publicação existe no PostgreSQL
3. Verificar se logical replication está habilitado
4. Verificar logs do Electric SQL para erros

### Problema 3: Logical replication não funciona

**Sintomas**: Electric SQL não sincroniza dados

**Soluções**:

1. Verificar se `wal_level = 'logical'` no PostgreSQL
2. Verificar se publicação existe e tem tabelas
3. Verificar se `max_replication_slots >= 10`
4. **Pode requerer restart do PostgreSQL** após habilitar logical replication

### Problema 4: Publicação não pode ser criada

**Sintomas**: Erro ao criar publicação

**Soluções**:

1. Verificar se tabelas existem (TypeORM deve criar com `synchronize: true`)
2. Executar script após backend criar tabelas
3. Verificar permissões do usuário do PostgreSQL

## 📋 Checklist de Verificação

Após deploy, verificar:

-   [ ] `DATABASE_URL` está configurada no Railway
-   [ ] PostgreSQL tem `wal_level = 'logical'`
-   [ ] PostgreSQL tem `max_replication_slots >= 10`
-   [ ] Publicação `electric_publication` existe
-   [ ] Publicação tem tabelas: messages, users, keys, pre_keys
-   [ ] Electric SQL está rodando (health check retorna 200)
-   [ ] Frontend consegue conectar ao Electric SQL
-   [ ] `useLiveQuery` funciona sem erros

## 🔧 Comandos Úteis

```bash
# Verificar configuração do PostgreSQL
railway connect --service postgres
psql -c "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');"

# Verificar publicação
psql -c "SELECT * FROM pg_publication WHERE pubname = 'electric_publication';"
psql -c "SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';"

# Ver logs do backend
railway logs --service backend

# Testar Electric SQL
railway connect --service backend
curl http://localhost:5133/health
```

## 📝 Notas Importantes

1. **Logical Replication**: Pode requerer **restart do PostgreSQL** após habilitar
2. **Docker**: Railway pode não ter Docker disponível - nesse caso, Electric SQL não vai iniciar
3. **Publicação**: Deve ser criada **após** as tabelas existirem
4. **Shapes**: Electric SQL cria shapes automaticamente quando conecta ao banco

---

**Status**: ✅ Configurações aplicadas  
**Próximo passo**: Fazer deploy no Railway e seguir os passos acima
