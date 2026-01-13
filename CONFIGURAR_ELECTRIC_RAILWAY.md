# ⚡ Configuração Completa: Electric SQL no Railway

## ✅ Configurações Aplicadas

### 1. Script `start-with-electric.js` Melhorado

-   ✅ Parse automático do `DATABASE_URL` para extrair credenciais
-   ✅ Configuração automática de logical replication
-   ✅ Health check melhorado com mais tentativas
-   ✅ Logs mais informativos

### 2. Migrations do Electric SQL

-   ✅ `001-enable-logical-replication.sql` - Habilita logical replication
-   ✅ `setup-electric-postgres.sql` - Script para configurar PostgreSQL

### 3. Frontend Reativado

-   ✅ `useLiveQuery` reativado no `useMessages.ts`
-   ✅ Query completa restaurada

## 🚀 Próximos Passos no Railway

### 1. Verificar Variáveis de Ambiente

No Railway, o serviço **backend** deve ter:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
ELECTRIC_PORT=5133
AUTH_MODE=insecure
```

**Nota**: O script agora extrai automaticamente os parâmetros de logical replication do `DATABASE_URL`, mas você pode configurar explicitamente:

```bash
LOGICAL_PUBLISHER_HOST=<host-do-postgres>
LOGICAL_PUBLISHER_PORT=5432
LOGICAL_PUBLISHER_USER=<user-do-postgres>
LOGICAL_PUBLISHER_PASSWORD=<password-do-postgres>
LOGICAL_PUBLISHER_DATABASE=<database-name>
```

### 2. Configurar PostgreSQL para Logical Replication

**IMPORTANTE**: O PostgreSQL do Railway precisa ter logical replication habilitado.

Execute no PostgreSQL do Railway:

```bash
# Conectar ao PostgreSQL
railway connect --service postgres

# Executar script de configuração
psql -f backend/scripts/setup-electric-postgres.sql
```

Ou manualmente:

```sql
-- Habilitar logical replication
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- Criar publicação (após tabelas existirem)
CREATE PUBLICATION electric_publication FOR TABLE messages, users, keys, pre_keys;
```

**⚠️ ATENÇÃO**: Mudanças em `wal_level` podem requerer **restart do PostgreSQL**. No Railway, isso pode ser feito via dashboard ou suporte.

### 3. Verificar se Electric SQL Está Rodando

Após deploy, verificar logs:

```bash
railway logs --service backend
```

Procurar por:

-   `✅ Electric SQL está rodando na porta 5133`
-   `🐳 Docker encontrado, iniciando Electric SQL via Docker...`
-   Erros relacionados ao Docker ou Electric SQL

### 4. Testar Endpoint do Electric SQL

```bash
# Health check
curl https://backend-production-38c9.up.railway.app:5133/health

# Ou via Railway
railway connect --service backend
curl http://localhost:5133/health
```

### 5. Verificar Publicação no PostgreSQL

```sql
-- Verificar publicação
SELECT * FROM pg_publication WHERE pubname = 'electric_publication';

-- Verificar tabelas na publicação
SELECT * FROM pg_publication_tables WHERE pubname = 'electric_publication';
```

## 🔍 Troubleshooting

### Se Electric SQL não iniciar:

1. **Verificar se Docker está disponível**:

    ```bash
    railway logs --service backend | grep -i docker
    ```

2. **Verificar se DATABASE_URL está configurada**:

    ```bash
    railway variables --service backend | grep DATABASE_URL
    ```

3. **Verificar se logical replication está habilitado**:
    ```sql
    SELECT name, setting FROM pg_settings WHERE name = 'wal_level';
    -- Deve retornar: logical
    ```

### Se "Unknown expression type: undefined" continuar:

1. **Verificar se Electric SQL está acessível**:

    - Testar endpoint `/health`
    - Verificar se porta 5133 está exposta

2. **Verificar se shapes estão configurados**:

    - Electric SQL cria shapes automaticamente quando conecta
    - Verificar logs do Electric SQL para erros de shape

3. **Verificar se publicação existe**:
    ```sql
    SELECT * FROM pg_publication WHERE pubname = 'electric_publication';
    ```

## 📝 Notas Importantes

-   O Railway pode não ter Docker disponível - nesse caso, Electric SQL não vai iniciar
-   Se Docker não estiver disponível, considere usar Electric SQL como serviço separado
-   Logical replication requer restart do PostgreSQL após habilitar
-   A publicação deve ser criada **após** as tabelas existirem

---

**Status**: ✅ Configurações aplicadas  
**Próximo passo**: Fazer deploy no Railway e verificar se Electric SQL inicia corretamente
